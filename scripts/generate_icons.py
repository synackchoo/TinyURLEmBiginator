from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent.parent
ICONS_DIR = ROOT / "icons"
BASE_SIZE = 128


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in ("DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def add_alpha(image: Image.Image, alpha: int) -> Image.Image:
    rgba = image.copy()
    alpha_channel = rgba.getchannel("A").point(lambda value: min(value, alpha))
    rgba.putalpha(alpha_channel)
    return rgba


def make_lens_mask(size: int, center: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse(
        (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius),
        fill=255
    )
    return mask


def draw_icon(size: int = BASE_SIZE) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    outer = (8, 8, size - 8, size - 8)
    header = (18, 18, size - 18, 34)
    content = (34, 42, 92, 92)

    draw.rounded_rectangle(outer, radius=20, fill=(243, 244, 246, 255), outline=(191, 197, 204, 255), width=2)
    draw.rounded_rectangle(header, radius=9, fill=(228, 233, 240, 255), outline=(160, 169, 179, 255), width=1)

    for x, color in ((24, (239, 99, 92, 255)), (34, (241, 181, 63, 255)), (44, (77, 195, 112, 255))):
        draw.ellipse((x - 3, 22, x + 3, 28), fill=color)

    draw.rounded_rectangle(content, radius=6, fill=(255, 255, 255, 255), outline=(25, 32, 56, 255), width=2)

    font_small = load_font(12)
    font_large = load_font(16)
    url_text = "https://example.com/path"

    blurred_text = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    blurred_draw = ImageDraw.Draw(blurred_text)
    for y in (50, 68):
        blurred_draw.text((39, y), url_text, font=font_small, fill=(102, 112, 133, 180))
    blurred_text = blurred_text.filter(ImageFilter.GaussianBlur(radius=1.6))
    image.alpha_composite(add_alpha(blurred_text, 140))

    lens_center = (84, 54)
    lens_radius = 22
    lens_mask = make_lens_mask(size, lens_center, lens_radius)

    focused_text = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    focused_draw = ImageDraw.Draw(focused_text)
    focused_draw.text((28, 44), url_text, font=font_large, fill=(31, 41, 55, 255))
    focused_draw.text((28, 62), url_text, font=font_large, fill=(31, 41, 55, 255))

    tint = Image.new("RGBA", (size, size), (70, 112, 229, 0))
    tint_draw = ImageDraw.Draw(tint)
    tint_draw.ellipse(
        (lens_center[0] - lens_radius, lens_center[1] - lens_radius, lens_center[0] + lens_radius, lens_center[1] + lens_radius),
        fill=(211, 227, 255, 110)
    )
    image.alpha_composite(tint)
    image = Image.composite(focused_text, image, lens_mask)

    highlight = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    highlight_draw = ImageDraw.Draw(highlight)
    highlight_draw.ellipse(
        (lens_center[0] - lens_radius + 6, lens_center[1] - lens_radius + 5, lens_center[0] - 2, lens_center[1] - 6),
        fill=(255, 255, 255, 68)
    )
    image.alpha_composite(highlight)

    handle_end = (109, 82)
    outline_draw = ImageDraw.Draw(image)
    outline_draw.line((lens_center[0] + 14, lens_center[1] + 14, handle_end[0], handle_end[1]), fill=(37, 99, 235, 255), width=10)
    outline_draw.line((lens_center[0] + 14, lens_center[1] + 14, handle_end[0], handle_end[1]), fill=(16, 58, 166, 255), width=6)
    outline_draw.ellipse(
        (lens_center[0] - lens_radius, lens_center[1] - lens_radius, lens_center[0] + lens_radius, lens_center[1] + lens_radius),
        outline=(37, 99, 235, 255),
        width=6
    )

    return image


def save_icons() -> None:
    base = draw_icon()
    for size in (16, 48, 128):
        output = base.resize((size, size), Image.Resampling.LANCZOS)
        output.save(ICONS_DIR / f"icon{size}.png")


if __name__ == "__main__":
    save_icons()
