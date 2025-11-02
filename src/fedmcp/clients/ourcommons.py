"""Helpers for fetching Hansard XML exports from the House of Commons."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from fedmcp.http import RateLimitedSession


DOCUMENTVIEWER_BASE = "https://www.ourcommons.ca/DocumentViewer/en/house/"


@dataclass
class HansardSpeech:
    """A single Hansard speech entry extracted from the XML document."""

    speaker_name: Optional[str]
    speaker_id: Optional[str]
    party: Optional[str]
    riding: Optional[str]
    timecode: Optional[str]
    text: str


@dataclass
class HansardSection:
    """A logical section of the Hansard (e.g., Oral Questions)."""

    title: str
    speeches: List[HansardSpeech] = field(default_factory=list)


@dataclass
class HansardSitting:
    """Parsed representation of a House of Commons sitting."""

    date: Optional[str]
    number: Optional[str]
    language: Optional[str]
    source_xml_url: str
    sections: List[HansardSection] = field(default_factory=list)


class OurCommonsHansardClient:
    """Retrieve and parse the Commons Hansard XML exports."""

    def __init__(
        self,
        *,
        session: Optional[RateLimitedSession] = None,
    ) -> None:
        self.session = session or RateLimitedSession()

    def build_documentviewer_url(self, slug: str) -> str:
        """Normalise a DocumentViewer slug into a fully-qualified URL."""

        slug = slug.lstrip("/")
        return urljoin(DOCUMENTVIEWER_BASE, slug)

    # ------------------------------------------------------------------
    # Fetch helpers
    # ------------------------------------------------------------------
    def fetch_documentviewer(self, slug_or_url: str) -> str:
        url = (
            slug_or_url
            if slug_or_url.startswith("http")
            else self.build_documentviewer_url(slug_or_url)
        )
        response = self.session.get(url)
        response.raise_for_status()
        return response.text

    def find_xml_link(self, documentviewer_html: str) -> str:
        """Extract the XML download link from a DocumentViewer HTML page."""

        soup = BeautifulSoup(documentviewer_html, "html.parser")
        link = soup.find("a", string=re.compile(r"XML", re.I))
        if not link or not link.get("href"):
            raise ValueError("Unable to locate XML download link on page")
        href = link["href"]
        if href.startswith("http"):
            return href
        return urljoin("https://www.ourcommons.ca", href)

    def fetch_sitting_xml(self, slug_or_url: str) -> Tuple[str, str]:
        html = self.fetch_documentviewer(slug_or_url)
        xml_url = self.find_xml_link(html)
        response = self.session.get(xml_url, headers={"Accept": "application/xml"})
        response.raise_for_status()
        # Decode with utf-8-sig to automatically strip BOM
        xml_text = response.content.decode('utf-8-sig')
        return xml_text, xml_url

    # ------------------------------------------------------------------
    # Parsing helpers
    # ------------------------------------------------------------------
    def parse_sitting(self, xml_text: str, *, source_url: str) -> HansardSitting:
        """Parse a Hansard XML document into simplified Python data structures."""

        from xml.etree import ElementTree as ET

        # Strip UTF-8 BOM if present
        if xml_text.startswith('\ufeff'):
            xml_text = xml_text[1:]

        tree = ET.fromstring(xml_text)

        # Extract metadata from ExtractedInformation
        date = None
        number = None
        language = tree.attrib.get('{http://www.w3.org/XML/1998/namespace}lang', None)

        extracted_info = tree.find(".//ExtractedInformation")
        if extracted_info is not None:
            for item in extracted_info.findall("ExtractedItem"):
                name = item.get("Name", "")
                if name == "Date":
                    date = item.text
                elif name == "Number":
                    number = item.text

        # Parse interventions as speeches, grouped by sections if available
        sections: List[HansardSection] = []

        # Try to find sections first (some formats may have them)
        section_elements = tree.findall(".//section")
        if section_elements:
            for section_el in section_elements:
                title = section_el.findtext("title") or "Untitled section"
                speeches = [self._parse_speech(speech_el) for speech_el in section_el.findall(".//Intervention")]
                sections.append(HansardSection(title=title, speeches=speeches))
        else:
            # No explicit sections, collect all interventions
            interventions = tree.findall(".//Intervention")
            if interventions:
                speeches = [self._parse_speech(interv) for interv in interventions]
                sections.append(HansardSection(title="Hansard Proceedings", speeches=speeches))

        return HansardSitting(
            date=date,
            number=number,
            language=language,
            source_xml_url=source_url,
            sections=sections,
        )

    def _parse_speech(self, speech_el) -> HansardSpeech:
        # Handle actual Hansard XML structure (Intervention elements)
        person = speech_el.find("PersonSpeaking")
        speaker_name = None
        speaker_id = None
        party = None
        riding = None

        if person is not None:
            # Affiliation format: "Name (Riding, Party)"
            affiliation = person.findtext("Affiliation", "")
            if affiliation:
                # Try to parse affiliation string
                speaker_name = affiliation.split("(")[0].strip() if "(" in affiliation else affiliation
                if "(" in affiliation and ")" in affiliation:
                    paren_content = affiliation[affiliation.index("(") + 1:affiliation.rindex(")")]
                    parts = paren_content.split(",")
                    if len(parts) >= 2:
                        riding = parts[0].strip()
                        party = parts[1].strip()
                    elif len(parts) == 1:
                        # Could be just riding or just party
                        riding = parts[0].strip()

        # Speech ID
        speaker_id = speech_el.get("id")

        # Extract time if available
        timecode = speech_el.findtext("time")

        # Extract text from Content/ParaText elements
        content = speech_el.find("Content")
        paragraphs = []
        if content is not None:
            # Get all ParaText elements
            for para_text in content.findall(".//ParaText"):
                text = "".join(para_text.itertext()).strip()
                if text:
                    paragraphs.append(text)

        text = "\n\n".join(paragraphs)

        return HansardSpeech(
            speaker_name=speaker_name,
            speaker_id=speaker_id,
            party=party,
            riding=riding,
            timecode=timecode,
            text=text,
        )

    # ------------------------------------------------------------------
    # Convenience API
    # ------------------------------------------------------------------
    def get_sitting(
        self, slug_or_url: str, *, parse: bool = True
    ) -> HansardSitting | str:
        xml_text, xml_url = self.fetch_sitting_xml(slug_or_url)
        if not parse:
            return xml_text
        return self.parse_sitting(xml_text, source_url=xml_url)
