import calendar

from .models import FixedExpensePayment, Product
from django.db import transaction
from django.utils import timezone


def _validate_consumable(product: Product):
    if product.type != "consumable":
        raise ValueError("Esta acción solo aplica a productos consumibles")

def consume_product(product_id: int, quantity: int = 1):
    with transaction.atomic():
        product = Product.objects.select_for_update().get(id=product_id)

        _validate_consumable(product)

        if quantity <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")

        if product.stock < quantity:
            raise ValueError("Stock insuficiente")

        product.stock -= quantity
        product.save()

        return {
            "product": product,
            "low_stock": product.stock <= product.stock_min
        }


def restock_product(product_id: int, quantity: int = 1):
    with transaction.atomic():
        product = Product.objects.select_for_update().get(id=product_id)

        _validate_consumable(product)

        if quantity <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")

        product.stock += quantity
        product.last_purchase = timezone.localdate()
        product.save()

        return {
            "product": product
        }


def mark_product_out_of_stock(product_id: int):
    with transaction.atomic():
        product = Product.objects.select_for_update().get(id=product_id)

        _validate_consumable(product)

        product.stock = 0
        product.save()

        return {
            "product": product,
            "low_stock": True,
        }


def _add_one_month(target_date):
    year = target_date.year + (1 if target_date.month == 12 else 0)
    month = 1 if target_date.month == 12 else target_date.month + 1
    day = min(target_date.day, calendar.monthrange(year, month)[1])
    return target_date.replace(year=year, month=month, day=day)


def register_payment(product_id: int):
    with transaction.atomic():
        product = Product.objects.select_for_update().get(id=product_id)

        if product.category not in ["services", "subscription", "home"]:
            raise ValueError("Solo aplica a gastos fijos")

        today = timezone.localdate()
        payment_period = today.replace(day=1)
        payment_amount = product.price or 0

        payment, _ = FixedExpensePayment.objects.update_or_create(
            product=product,
            date=payment_period,
            defaults={"amount": payment_amount},
        )

        product.last_purchase = today

        if product.next_due_date:
            product.next_due_date = _add_one_month(product.next_due_date)

        product.save()

        return {
            "product": product,
            "payment": payment,
        }