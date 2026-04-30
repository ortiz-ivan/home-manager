import calendar
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.configuration.models import (
    InventorySettings,
    get_budget_bucket_ratio_map,
    get_category_fallback_unit_cost,
)
from apps.expenses.models import FixedExpense, FixedExpensePayment, Income, VariableExpense
from apps.purchases.models import Product

from .models import FinancialEvent, MonthlyClose


def _normalize_change_reason(reason, default_reason="", required=False):
    value = str(reason or "").strip()

    if required and not value:
        raise ValueError("Debes indicar el motivo del cambio")

    return value or default_reason


def _to_decimal(value, default="0"):
    if value is None:
        return Decimal(default)

    if isinstance(value, Decimal):
        return value

    return Decimal(str(value))


def _to_json_ready(value):
    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, date):
        return value.isoformat()

    if isinstance(value, dict):
        return {key: _to_json_ready(item) for key, item in value.items()}

    if isinstance(value, (list, tuple)):
        return [_to_json_ready(item) for item in value]

    return value


def _snapshot_income(income: Income):
    return _to_json_ready({
        "id": income.id,
        "amount": income.amount,
        "source": income.source,
        "notes": income.notes,
        "date": income.date,
    })


def _snapshot_variable_expense(expense: VariableExpense):
    return _to_json_ready({
        "id": expense.id,
        "amount": expense.amount,
        "category": expense.category,
        "budget_bucket": expense.budget_bucket,
        "description": expense.description,
        "notes": expense.notes,
        "date": expense.date,
    })


def _snapshot_fixed_expense(expense: FixedExpense):
    return _to_json_ready({
        "id": expense.id,
        "name": expense.name,
        "category": expense.category,
        "budget_bucket": expense.budget_bucket,
        "monthly_amount": expense.monthly_amount,
        "next_due_date": expense.next_due_date,
        "is_active": expense.is_active,
    })


def _snapshot_fixed_payment(payment: FixedExpensePayment):
    return _to_json_ready({
        "id": payment.id,
        "fixed_expense_id": payment.fixed_expense_id,
        "fixed_expense_name": payment.fixed_expense.name,
        "amount": payment.amount,
        "date": payment.date,
    })


def _snapshot_monthly_close(monthly_close: MonthlyClose):
    return _to_json_ready({
        "id": monthly_close.id,
        "month": monthly_close.month,
        "year": monthly_close.year,
        "notes": monthly_close.notes,
        "summary_snapshot": monthly_close.summary_snapshot,
        "created_at": monthly_close.created_at,
    })


def _record_financial_event(
    *,
    entity_type,
    action,
    entity_id,
    title,
    amount,
    effective_date,
    reason="",
    previous_data=None,
    current_data=None,
    metadata=None,
):
    effective_date = effective_date or timezone.localdate()
    return FinancialEvent.objects.create(
        entity_type=entity_type,
        action=action,
        entity_id=entity_id,
        title=title,
        amount=amount,
        effective_date=effective_date,
        month=effective_date.month,
        year=effective_date.year,
        reason=reason,
        previous_data=_to_json_ready(previous_data or {}),
        current_data=_to_json_ready(current_data or {}),
        metadata=_to_json_ready(metadata or {}),
    )


def _add_one_month(target_date):
    year = target_date.year + (1 if target_date.month == 12 else 0)
    month = 1 if target_date.month == 12 else target_date.month + 1
    day = min(target_date.day, calendar.monthrange(year, month)[1])
    return target_date.replace(year=year, month=month, day=day)


def _get_next_month_period(month: int, year: int):
    if month == 12:
        return 1, year + 1
    return month + 1, year


def _get_previous_month_period(month: int, year: int):
    if month == 1:
        return 12, year - 1
    return month - 1, year


def _ensure_automatic_monthly_close(today=None):
    reference_date = today or timezone.localdate()
    previous_month, previous_year = _get_previous_month_period(reference_date.month, reference_date.year)

    if MonthlyClose.objects.filter(month=previous_month, year=previous_year).exists():
        return None

    return create_monthly_close(
        previous_month,
        previous_year,
        notes="Cierre automatico de fin de mes",
        auto_generated=True,
    )


def get_active_financial_period():
    _ensure_automatic_monthly_close()
    today = timezone.localdate()
    current_period = (today.year, today.month)
    latest_close = MonthlyClose.objects.order_by("-year", "-month", "-id").first()

    if latest_close is None:
        return today.month, today.year

    next_month, next_year = _get_next_month_period(latest_close.month, latest_close.year)
    next_open_period = (next_year, next_month)

    if next_open_period > current_period:
        return next_month, next_year

    return today.month, today.year


def get_active_financial_date():
    month, year = get_active_financial_period()
    today = timezone.localdate()

    if today.year == year and today.month == month:
        return today

    return date(year, month, 1)


def calculate_monthly_finance_summary(month: int, year: int):
    settings_data = InventorySettings.get_solo().get_config()
    frequency_weight = settings_data.get("usage_frequency_weights", {})
    budget_target_ratio = get_budget_bucket_ratio_map(settings_data)

    products = Product.objects.filter(is_active=True)
    fixed_expenses = FixedExpense.objects.filter(is_active=True)
    home_estimated_expenses = Decimal("0")
    fixed_estimated_expenses = Decimal("0")
    budget_actuals = {
        "needs": Decimal("0"),
        "wants": Decimal("0"),
        "savings": Decimal("0"),
    }

    for product in products:
        budget_bucket = product.budget_bucket or Product.get_budget_bucket_for_category(product.category)

        fallback_cost = _to_decimal(get_category_fallback_unit_cost(settings_data, product.category, 4))
        base_cost = _to_decimal(product.price) if product.price and product.price > 0 else fallback_cost
        frequency = _to_decimal(frequency_weight.get(product.usage_frequency, 1), default="1")
        projected_units = product.stock_min if product.type == "consumable" else Decimal("1")
        estimate = projected_units * base_cost * frequency
        home_estimated_expenses += estimate
        budget_actuals[budget_bucket] += estimate

    for expense in fixed_expenses:
        fixed_amount = _to_decimal(expense.monthly_amount)
        budget_bucket = expense.budget_bucket or FixedExpense.get_budget_bucket_for_category(expense.category)
        fixed_estimated_expenses += fixed_amount
        budget_actuals[budget_bucket] += fixed_amount

    variable_month_expenses = Decimal("0")
    variable_expenses = VariableExpense.objects.filter(date__year=year, date__month=month)

    for expense in variable_expenses:
        amount = _to_decimal(expense.amount)
        budget_bucket = expense.budget_bucket or VariableExpense.get_budget_bucket_for_category(expense.category)
        variable_month_expenses += amount
        budget_actuals[budget_bucket] += amount

    estimated_expenses = home_estimated_expenses + fixed_estimated_expenses + variable_month_expenses

    month_income = (
        Income.objects.filter(date__year=year, date__month=month).aggregate(total=Sum("amount"))["total"]
        or 0
    )
    total_income = _to_decimal(month_income)

    expense_percentage = None
    if total_income > 0:
        expense_percentage = (estimated_expenses / total_income) * 100

    budget_targets = {
        bucket: round(total_income * _to_decimal(ratio), 2)
        for bucket, ratio in budget_target_ratio.items()
    }
    budget_actuals["needs"] = round(budget_actuals["needs"], 2)
    budget_actuals["wants"] = round(budget_actuals["wants"], 2)
    budget_actuals["savings"] = round(
        max(total_income - budget_actuals["needs"] - budget_actuals["wants"], 0),
        2,
    )
    budget_variance = {
        bucket: round(budget_actuals[bucket] - budget_targets[bucket], 2)
        for bucket in budget_target_ratio
    }

    monthly_close = MonthlyClose.objects.filter(month=month, year=year).first()

    return {
        "month": month,
        "year": year,
        "total_income": float(round(total_income, 2)),
        "home_estimated_expenses": float(round(home_estimated_expenses, 2)),
        "fixed_estimated_expenses": float(round(fixed_estimated_expenses, 2)),
        "variable_expenses": float(round(variable_month_expenses, 2)),
        "estimated_expenses": float(round(estimated_expenses, 2)),
        "expense_percentage": float(round(expense_percentage, 2)) if expense_percentage is not None else None,
        "remaining_balance": float(round(total_income - estimated_expenses, 2)),
        "rule_50_30_20": {
            "targets": {bucket: float(value) for bucket, value in budget_targets.items()},
            "actuals": {bucket: float(value) for bucket, value in budget_actuals.items()},
            "variance": {bucket: float(value) for bucket, value in budget_variance.items()},
        },
        "monthly_close": _snapshot_monthly_close(monthly_close) if monthly_close else None,
    }


def create_monthly_close(month: int, year: int, notes="", auto_generated=False):
    if month < 1 or month > 12:
        raise ValueError("El mes debe estar entre 1 y 12")

    if MonthlyClose.objects.filter(month=month, year=year).exists():
        raise ValueError("Ese mes ya fue cerrado")

    summary = calculate_monthly_finance_summary(month, year)
    close_date = timezone.datetime(year=year, month=month, day=1).date()
    default_reason = "Cierre automatico de fin de mes" if auto_generated else "Cierre mensual generado"
    reason = _normalize_change_reason(notes, default_reason=default_reason)

    with transaction.atomic():
        monthly_close = MonthlyClose.objects.create(
            month=month,
            year=year,
            notes=notes.strip(),
            summary_snapshot=summary,
        )
        _record_financial_event(
            entity_type="monthly_close",
            action="monthly_closed",
            entity_id=monthly_close.id,
            title=f"Cierre mensual {month:02d}/{year}",
            amount=summary["remaining_balance"],
            effective_date=close_date,
            reason=reason,
            current_data=_snapshot_monthly_close(monthly_close),
            metadata={
                "summary_snapshot": summary,
                "auto_generated": auto_generated,
            },
        )
        return monthly_close