from contextvars import ContextVar
request_gateway_url = ContextVar('request_gateway_url', default=None)
