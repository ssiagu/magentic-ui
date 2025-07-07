import os
from urllib.parse import parse_qs, urlparse

from mcp.server import FastMCP
from youtube_transcript_api import TranscriptsDisabled, YouTubeTranscriptApi

app = FastMCP("get_youtube_transcript")


def get_video_id(url: str) -> str:
    """
    Parses the video_id from a youtube.com url.

    Args:
        url: The URL of the YouTube video.

    Returns:
        The parsed video_id for use in other functions.
    """

    parsed_url = urlparse(url)
    if parsed_url.hostname == "youtu.be":
        video_id = parsed_url.path[1:]
    elif parsed_url.hostname in ("www.youtube.com", "youtube.com"):
        if parsed_url.path == "/watch":
            query_params = parse_qs(parsed_url.query)
            video_id = query_params.get("v", [None])[0]
        elif parsed_url.path.startswith("/embed/"):
            video_id = parsed_url.path.split("/")[2]
        elif parsed_url.path.startswith("/v/"):
            video_id = parsed_url.path.split("/")[2]
        else:
            video_id = None
    else:
        video_id = None

    if not video_id:
        raise ValueError("Invalid YouTube URL")

    return video_id


@app.tool()
def get_video_transcript(url: str) -> str:
    """
    Fetches the transcript of a YouTube video.

    Args:
        url: The URL of the YouTube video.

    Returns:
        The transcript as a string.
    """
    # api_key = os.environ.get("YOUTUBE_API_KEY")

    # if not api_key:
    #     raise ValueError("YouTube API key must be provided or set as YOUTUBE_API_KEY environment variable.")


    youtube = YouTubeTranscriptApi()
    transcript = youtube.fetch(video_id=get_video_id(url))
    return "\n".join(chunk.text for chunk in transcript)


def list_transcript_languages(video_id: str):
    """
    Lists the available transcripts for a YouTube video.
    
    Args:
        video_id: The video_id of the Youtube video
    
    Returns:
        The list of available transcript languages for the video.
    """

    youtube = YouTubeTranscriptApi()
    transcripts = youtube.list_transcripts(video_id=video_id)
    return [t.language_code for t in transcripts]


if __name__ == "__main__":
    app.run(transport="stdio")
