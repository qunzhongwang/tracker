from __future__ import annotations

import logging

import httpx

from backend.config import get_settings

logger = logging.getLogger(__name__)

NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


def _headers() -> dict:
    settings = get_settings()
    return {
        "Authorization": f"Bearer {settings.notion.api_key}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


async def search_pages(query: str = "", limit: int = 20) -> list[dict]:
    settings = get_settings()
    if not settings.notion.enabled or not settings.notion.api_key:
        return []

    async with httpx.AsyncClient() as client:
        body: dict = {"page_size": limit}
        if query:
            body["query"] = query
        resp = await client.post(
            f"{NOTION_API}/search",
            headers=_headers(),
            json=body,
        )
        if resp.status_code != 200:
            logger.error(f"Notion search failed: {resp.text}")
            return []

        results = []
        for item in resp.json().get("results", []):
            title = ""
            props = item.get("properties", {})
            for prop in props.values():
                if prop.get("type") == "title":
                    title_parts = prop.get("title", [])
                    title = "".join(t.get("plain_text", "") for t in title_parts)
                    break

            results.append({
                "id": item.get("id", ""),
                "title": title,
                "url": item.get("url", ""),
                "created_time": item.get("created_time", ""),
                "last_edited_time": item.get("last_edited_time", ""),
            })
        return results


async def get_page_content(page_id: str) -> dict:
    settings = get_settings()
    if not settings.notion.enabled:
        return {}

    async with httpx.AsyncClient() as client:
        # Get page properties
        resp = await client.get(
            f"{NOTION_API}/pages/{page_id}",
            headers=_headers(),
        )
        page_data = resp.json() if resp.status_code == 200 else {}

        # Get page blocks (content)
        resp2 = await client.get(
            f"{NOTION_API}/blocks/{page_id}/children",
            headers=_headers(),
            params={"page_size": 100},
        )
        blocks = resp2.json().get("results", []) if resp2.status_code == 200 else []

        # Extract text content from blocks
        content_parts = []
        for block in blocks:
            block_type = block.get("type", "")
            block_data = block.get(block_type, {})
            if "rich_text" in block_data:
                text = "".join(t.get("plain_text", "") for t in block_data["rich_text"])
                content_parts.append(text)

        return {
            "id": page_data.get("id", page_id),
            "properties": page_data.get("properties", {}),
            "content": "\n".join(content_parts),
            "blocks": blocks,
        }


async def create_page(title: str, content: str = "") -> dict | None:
    settings = get_settings()
    if not settings.notion.enabled or not settings.notion.database_id:
        return None

    body: dict = {
        "parent": {"database_id": settings.notion.database_id},
        "properties": {
            "Name": {
                "title": [{"text": {"content": title}}]
            }
        },
    }

    if content:
        body["children"] = [
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": content}}]
                },
            }
        ]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{NOTION_API}/pages",
            headers=_headers(),
            json=body,
        )
        if resp.status_code in (200, 201):
            return resp.json()
        logger.error(f"Failed to create Notion page: {resp.text}")
        return None
