"""FastMCP server that exposes the AfterEffects CEP tools."""

from __future__ import annotations

import argparse
import os
from typing import Any, Callable, Dict, List

import requests
from fastmcp import FastMCP

from .ae_client import AEBridgeError, AEClient


DEFAULT_BRIDGE_URL = os.environ.get("AE_BRIDGE_URL", "http://127.0.0.1:8080")


def create_mcp(base_url: str | None = None) -> FastMCP:
    """Instantiate a FastMCP server wired up to the CEP HTTP bridge."""

    bridge_url = base_url or DEFAULT_BRIDGE_URL
    ae_client = AEClient(base_url=bridge_url)
    server = FastMCP("AfterEffects MCP Bridge")

    def safe_call(action: str, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        try:
            return func(*args, **kwargs)
        except AEBridgeError as exc:
            raise RuntimeError(f"{action} failed: {exc}") from exc
        except requests.RequestException as exc:
            raise RuntimeError(f"{action} failed: {exc}") from exc

    @server.tool
    def get_layers() -> List[Dict[str, Any]]:
        """Return all layers from the active composition."""
        return safe_call("Layer retrieval", ae_client.get_layers)

    @server.tool
    def get_selected_properties() -> List[Dict[str, Any]]:
        """Return the currently selected properties across selected layers."""
        return safe_call("Selected property retrieval", ae_client.get_selected_properties)

    @server.tool
    def get_properties(
        layer_id: int,
        include_groups: List[str] | None = None,
        exclude_groups: List[str] | None = None,
        max_depth: int | None = None,
    ) -> List[Dict[str, Any]]:
        """Return the property tree for a specific layer with optional filters."""
        return safe_call(
            "Property retrieval",
            ae_client.get_properties,
            layer_id,
            include_groups,
            exclude_groups,
            max_depth,
        )

    @server.tool
    def set_expression(layer_id: int, property_path: str, expression: str) -> Dict[str, Any]:
        """Apply an expression to a specific property."""
        return safe_call(
            "Expression application",
            ae_client.set_expression,
            layer_id,
            property_path,
            expression,
        )

    return server


mcp = create_mcp()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the FastMCP AfterEffects bridge.")
    parser.add_argument(
        "--transport",
        choices=("stdio", "http"),
        default="stdio",
        help="Transport used by FastMCP (default: stdio).",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="HTTP port when --transport=http (default: 8000).",
    )
    parser.add_argument(
        "--bridge-url",
        default=DEFAULT_BRIDGE_URL,
        help="Base URL for the CEP HTTP bridge.",
    )
    args = parser.parse_args()

    local_mcp = create_mcp(base_url=args.bridge_url)
    if args.transport == "stdio":
        local_mcp.run()
    else:
        local_mcp.run(transport="http", port=args.port)


if __name__ == "__main__":
    main()
