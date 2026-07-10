import redis
import json
import os
from functools import wraps
from typing import Callable
import logging
from pydantic import BaseModel

logger = logging.getLogger(__name__)

try:
    redis_client = redis.from_url(
        os.getenv("REDIS_URL", "redis://localhost:6379"),
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
    )
    redis_client.ping()
    REDIS_AVAILABLE = True
    logger.info("Redis connected successfully")
except Exception as e:
    redis_client = None
    REDIS_AVAILABLE = False
    logger.warning(f"Redis unavailable — caching disabled. Reason: {e}")


def _serialize(result):
    """Convert ORM objects / Pydantic models / dicts to a JSON-safe structure."""
    if isinstance(result, list):
        return [_serialize(item) for item in result]
    if isinstance(result, BaseModel):
        return result.model_dump(mode="json")
    if hasattr(result, "__dict__"):
        # SQLAlchemy ORM object — convert to plain dict, skip private attrs
        return {
            k: str(v) if not isinstance(v, (str, int, float, bool, type(None))) else v
            for k, v in result.__dict__.items()
            if not k.startswith("_")
        }
    if isinstance(result, dict):
        return {k: _serialize(v) for k, v in result.items()}
    return result


def cache_response(key: str, ttl: int = 30):
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not REDIS_AVAILABLE or redis_client is None:
                return func(*args, **kwargs)

            # Try cache first
            try:
                cached = redis_client.get(key)
                if cached:
                    logger.debug(f"Cache HIT: {key}")
                    return json.loads(cached)
            except Exception as e:
                logger.warning(f"Cache GET failed for {key}: {e}")

            # Cache miss — call real function
            result = func(*args, **kwargs)

            # Serialize and store
            try:
                serialized = _serialize(result)
                redis_client.setex(key, ttl, json.dumps(serialized, default=str))
                logger.debug(f"Cache SET: {key} (TTL={ttl}s)")
            except Exception as e:
                logger.warning(f"Cache SET failed for {key}: {e}")

            return result  # return original ORM result, not serialized version

        return wrapper
    return decorator


def invalidate_pattern(pattern: str):
    if not REDIS_AVAILABLE or redis_client is None:
        return
    try:
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
            logger.debug(f"Cache INVALIDATED: {len(keys)} keys matching '{pattern}'")
    except Exception as e:
        logger.warning(f"Cache invalidation failed for pattern '{pattern}': {e}")