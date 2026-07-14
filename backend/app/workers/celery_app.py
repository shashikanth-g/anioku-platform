"""Celery application instance, bound to Redis as both broker and result backend.

Task modules register against this instance; see tasks.py.
"""
from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "anku",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)
