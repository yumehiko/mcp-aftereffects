"""Thin HTTP client for the AfterEffects CEP bridge server."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

import requests


class AEBridgeError(RuntimeError):
    """Raised when the CEP bridge returns an error payload."""


@dataclass
class AEClient:
    """Simple wrapper around the existing CEP HTTP API."""

    base_url: str = "http://127.0.0.1:8080"
    timeout: float = 10.0

    def _url(self, path: str) -> str:
        return f"{self.base_url.rstrip('/')}{path}"

    def _handle_response(self, response: requests.Response) -> Any:
        response.raise_for_status()
        payload = response.json()
        if payload.get("status") != "success":
            message = payload.get("message", "Unknown error from AfterEffects bridge.")
            raise AEBridgeError(message)
        # Most GET endpoints return their payload inside the "data" key,
        # while POST /expression returns only status/message.
        return payload.get("data", payload)

    def get_layers(self) -> List[Dict[str, Any]]:
        """Return the list of layers in the active composition."""
        response = requests.get(self._url("/layers"), timeout=self.timeout)
        return self._handle_response(response)

    def get_selected_properties(self) -> List[Dict[str, Any]]:
        """Return the currently selected properties across layers."""
        response = requests.get(self._url("/selected-properties"), timeout=self.timeout)
        return self._handle_response(response)

    def get_properties(
        self,
        layer_id: int,
        include_groups: List[str] | None = None,
        exclude_groups: List[str] | None = None,
        max_depth: int | None = None,
    ) -> List[Dict[str, Any]]:
        """Return the property tree for the specified layer."""
        params: List[tuple[str, Any]] = [("layerId", layer_id)]
        if include_groups:
            for group in include_groups:
                if group:
                    params.append(("includeGroup", group))
        if exclude_groups:
            for group in exclude_groups:
                if group:
                    params.append(("excludeGroup", group))
        if max_depth is not None:
            params.append(("maxDepth", max_depth))

        response = requests.get(
            self._url("/properties"),
            params=params,
            timeout=self.timeout,
        )
        return self._handle_response(response)

    def set_expression(self, layer_id: int, property_path: str, expression: str) -> Dict[str, Any]:
        """Apply an expression to the given property."""
        response = requests.post(
            self._url("/expression"),
            json={
                "layerId": layer_id,
                "propertyPath": property_path,
                "expression": expression,
            },
            timeout=self.timeout,
        )
        return self._handle_response(response)
