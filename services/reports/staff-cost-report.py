#!/usr/bin/env python3
"""Generate IAGTM Staff Cost Report PDF for week 23 Feb - 1 Mar 2026."""

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.graphics import renderPDF

# IAGTM Brand Colors
NAVY = HexColor('#1B3A5C')
NAVY_LIGHT = HexColor('#2E5D8A')
GOLD = HexColor('#C4922A')
TEAL = HexColor('#1A8A7D')
GREEN = HexColor('#27AE60')
RED = HexColor('#C0392B')
BG_LIGHT = HexColor('#F8F9FB')
BORDER = HexColor('#E2E6EE')
TEXT_PRIMARY = HexColor('#1A1A2E')
TEXT_SECONDARY = HexColor('#5A6178')
TEXT_MUTED = HexColor('#8E95A9')
WHITE = colors.white

# Data
locations_data = {
    'Paddington': {
        'Mon 23': {'cost': 518.14, 'oncost': 569.95, 'hours': 53.0},
        'Tue 24': {'cost': 548.72, 'oncost': 603.60, 'hours': 50.2},
        'Wed 25': {'cost': 642.89, 'oncost': 707.18, 'hours': 47.6},
        'Thu 26': {'cost': 582.20, 'oncost': 640.42, 'hours': 57.8},
        'Fri 27': {'cost': 682.19, 'oncost': 750.41, 'hours': 51.1},
        'Sat 28': {'cost': 470.56, 'oncost': 517.62, 'hours': 59.2},
        'Sun 01': {'cost': 364.90, 'oncost': 401.39, 'hours': 41.3},
    },
    'Shoreditch': {
        'Mon 23': {'cost': 295.40, 'oncost': 324.94, 'hours': 28.0},
        'Tue 24': {'cost': 265.55, 'oncost': 292.11, 'hours': 24.5},
        'Wed 25': {'cost': 316.87, 'oncost': 348.56, 'hours': 21.6},
        'Thu 26': {'cost': 266.28, 'oncost': 292.91, 'hours': 19.9},
        'Fri 27': {'cost': 361.38, 'oncost': 397.52, 'hours': 31.8},
        'Sat 28': {'cost': 360.12, 'oncost': 396.13, 'hours': 25.1},
        'Sun 01': {'cost': 341.12, 'oncost': 375.23, 'hours': 25.8},
    },
    'Brent Cross': {
        'Mon 23': {'cost': 116.62, 'oncost': 128.28, 'hours': 8.3},
        'Tue 24': {'cost': 122.50, 'oncost': 134.75, 'hours': 8.8},
        'Wed 25': {'cost': 0.00, 'oncost': 0.00, 'hours': 8.5},
        'Thu 26': {'cost': 119.00, 'oncost': 130.90, 'hours': 8.5},
        'Fri 27': {'cost': 116.62, 'oncost': 128.28, 'hours': 8.3},
        'Sat 28': {'cost': 135.38, 'oncost': 148.92, 'hours': 9.7},
        'Sun 01': {'cost': 138.88, 'oncost': 152.77, 'hours': 9.9},
    },
    'Wandsworth': {
        'Mon 23': {'cost': 126.00, 'oncost': 138.60, 'hours': 9.0},
        'Tue 24': {'cost': 89.88, 'oncost': 98.87, 'hours': 6.4},
        'Wed 25': {'cost': 109.46, 'oncost': 120.41, 'hours': 8.4},
        'Thu 26': {'cost': 109.46, 'oncost': 120.41, 'hours': 8.4},
        'Fri 27': {'cost': 201.34, 'oncost': 221.47, 'hours': 14.8},
        'Sat 28': {'cost': 160.96, 'oncost': 177.06, 'hours': 11.9},
        'Sun 01': {'cost': 200.42, 'oncost': 220.46, 'hours': 14.8},
    },
    'Peckham': {
        'Mon 23': {'cost': 133.00, 'oncost': 146.30, 'hours': 9.5},
        'Tue 24': {'cost': 115.90, 'oncost': 127.49, 'hours': 9.5},
        'Wed 25': {'cost': 115.90, 'oncost': 127.49, 'hours': 9.5},
        'Thu 26': {'cost': 135.38, 'oncost': 148.92, 'hours': 9.7},
        'Fri 27': {'cost': 116.00, 'oncost': 127.60, 'hours': 9.3},
        'Sat 28': {'cost': 133.00, 'oncost': 146.30, 'hours': 9.5},
        'Sun 01': {'cost': 133.00, 'oncost': 146.30, 'hours': 9.5},
    },
}

days_order = ['Mon 23', 'Tue 24', 'Wed 25', 'Thu 26', 'Fri 27', 'Sat 28', 'Sun 01']
location_order = ['Paddington', 'Shoreditch', 'Brent Cross', 'Wandsworth', 'Peckham']

# Calculate totals
location_totals = {}
for loc in location_order:
    total_cost = sum(d['cost'] for d in locations_data[loc].values())
    total_oncost = sum(d['oncost'] for d in locations_data[loc].values())
    total_hours = sum(d['hours'] for d in locations_data[loc].values())
    location_totals[loc] = {'cost': total_cost, 'oncost': total_oncost, 'hours': total_hours}

grand_cost = sum(t['cost'] for t in location_totals.values())
grand_oncost = sum(t['oncost'] for t in location_totals.values())
grand_hours = sum(t['hours'] for t in location_totals.values())

# Build PDF
output_path = '/Users/michaelai/claude-work-folder/iagtm-agent/reports/output/2026-03-07-staff-cost-weekly-report.pdf'

doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=30*mm, rightMargin=30*mm,
    topMargin=25*mm, bottomMargin=20*mm,
)

styles = getSampleStyleSheet()

# Custom styles
style_brand = ParagraphStyle('Brand', parent=styles['Normal'],
    fontSize=11, fontName='Helvetica-Bold', textColor=NAVY,
    spaceAfter=0, leading=14)

style_meta = ParagraphStyle('Meta', parent=styles['Normal'],
    fontSize=9, fontName='Helvetica', textColor=TEXT_MUTED,
    alignment=TA_RIGHT, leading=14)

style_title = ParagraphStyle('Title', parent=styles['Normal'],
    fontSize=22, fontName='Helvetica-Bold', textColor=NAVY,
    spaceAfter=4, leading=28)

style_subtitle = ParagraphStyle('Subtitle', parent=styles['Normal'],
    fontSize=11, fontName='Helvetica', textColor=TEXT_SECONDARY,
    spaceAfter=20, leading=16)

style_section = ParagraphStyle('Section', parent=styles['Normal'],
    fontSize=14, fontName='Helvetica-Bold', textColor=NAVY,
    spaceBefore=20, spaceAfter=10, leading=18)

style_body = ParagraphStyle('Body', parent=styles['Normal'],
    fontSize=10, fontName='Helvetica', textColor=TEXT_PRIMARY,
    leading=15, spaceAfter=6)

style_callout_title = ParagraphStyle('CalloutTitle', parent=styles['Normal'],
    fontSize=9, fontName='Helvetica-Bold', textColor=NAVY,
    spaceAfter=4, leading=12)

style_callout_body = ParagraphStyle('CalloutBody', parent=styles['Normal'],
    fontSize=9.5, fontName='Helvetica', textColor=TEXT_SECONDARY,
    leading=14, spaceAfter=2)

style_footer = ParagraphStyle('Footer', parent=styles['Normal'],
    fontSize=8, fontName='Helvetica', textColor=TEXT_MUTED,
    alignment=TA_CENTER, spaceBefore=20)

style_kpi_label = ParagraphStyle('KPILabel', parent=styles['Normal'],
    fontSize=8, fontName='Helvetica-Bold', textColor=TEXT_MUTED,
    alignment=TA_CENTER, leading=10)

style_kpi_value = ParagraphStyle('KPIValue', parent=styles['Normal'],
    fontSize=20, fontName='Helvetica-Bold', textColor=NAVY,
    alignment=TA_CENTER, leading=24)

style_kpi_sub = ParagraphStyle('KPISub', parent=styles['Normal'],
    fontSize=8, fontName='Helvetica', textColor=TEXT_SECONDARY,
    alignment=TA_CENTER, leading=10)

elements = []

# --- HEADER ---
header_data = [[
    Paragraph("IT'S ALL GREEK <font color='#C4922A'>TO ME</font>", style_brand),
    Paragraph("Week: 23 Feb — 1 Mar 2026<br/>Generated: 7 Mar 2026<br/>Confidential", style_meta),
]]
header_table = Table(header_data, colWidths=[80*mm, 70*mm])
header_table.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LINEBELOW', (0, 0), (-1, 0), 2.5, NAVY),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
]))
elements.append(header_table)
elements.append(Spacer(1, 8*mm))

# --- TITLE ---
elements.append(Paragraph("Weekly Staff Cost Report", style_title))
elements.append(Paragraph("Labour costs across all 5 active locations — sourced from Deputy", style_subtitle))

# --- KPI CARDS ---
def kpi_cell(label, value, sub):
    return [
        Paragraph(label, style_kpi_label),
        Spacer(1, 2*mm),
        Paragraph(value, style_kpi_value),
        Spacer(1, 1*mm),
        Paragraph(sub, style_kpi_sub),
    ]

avg_rate = grand_cost / grand_hours if grand_hours else 0

kpi_data = [[
    kpi_cell("TOTAL WAGES", f"£{grand_cost:,.0f}", f"£{grand_oncost:,.0f} inc. on-costs"),
    kpi_cell("TOTAL HOURS", f"{grand_hours:,.0f}h", f"{grand_hours/7:.0f}h daily avg"),
    kpi_cell("AVG HOURLY RATE", f"£{avg_rate:.2f}", "across all locations"),
    kpi_cell("LOCATIONS", "5", "Chiswick not yet open"),
]]

# Flatten: each cell is a list of flowables, wrap in a mini table
from reportlab.platypus import TableStyle as TS

kpi_inner_tables = []
for cell_content in kpi_data[0]:
    t = Table([[item] for item in cell_content], colWidths=[34*mm])
    t.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    kpi_inner_tables.append(t)

kpi_table = Table([kpi_inner_tables], colWidths=[37.5*mm]*4)
kpi_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
    ('BOX', (0, 0), (0, 0), 0.5, BORDER),
    ('BOX', (1, 0), (1, 0), 0.5, BORDER),
    ('BOX', (2, 0), (2, 0), 0.5, BORDER),
    ('BOX', (3, 0), (3, 0), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 10),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ('LEFTPADDING', (0, 0), (-1, -1), 2),
    ('RIGHTPADDING', (0, 0), (-1, -1), 2),
    ('ROUNDEDCORNERS', [6, 6, 6, 6]),
]))
elements.append(kpi_table)
elements.append(Spacer(1, 8*mm))

# --- COST BY LOCATION BAR CHART ---
elements.append(Paragraph("Cost by Location (Wages)", style_section))
elements.append(HRFlowable(width="100%", thickness=1.5, color=BORDER, spaceAfter=8))

max_cost = max(t['cost'] for t in location_totals.values())
bar_colors = [NAVY, NAVY_LIGHT, TEAL, TEAL, GOLD]

d = Drawing(150*mm, len(location_order) * 12*mm + 5*mm)
bar_height = 8*mm
y_start = len(location_order) * 12*mm - 5*mm

for i, loc in enumerate(location_order):
    y = y_start - i * 12*mm
    cost = location_totals[loc]['cost']
    bar_width = (cost / max_cost) * 95*mm if max_cost > 0 else 0
    color = bar_colors[i]

    # Label
    d.add(String(0, y + 1*mm, loc, fontSize=9, fontName='Helvetica',
                 fillColor=TEXT_SECONDARY))

    # Bar
    d.add(Rect(28*mm, y - 1*mm, bar_width, bar_height,
               fillColor=color, strokeColor=None, rx=3, ry=3))

    # Value on bar
    if bar_width > 20*mm:
        d.add(String(28*mm + 3*mm, y + 0.5*mm, f"£{cost:,.0f}",
                     fontSize=8, fontName='Helvetica-Bold', fillColor=WHITE))
    else:
        d.add(String(28*mm + bar_width + 2*mm, y + 0.5*mm, f"£{cost:,.0f}",
                     fontSize=8, fontName='Helvetica-Bold', fillColor=TEXT_PRIMARY))

    # Hours
    d.add(String(130*mm, y + 0.5*mm, f"{location_totals[loc]['hours']:.0f}h",
                 fontSize=8, fontName='Helvetica', fillColor=TEXT_MUTED))

elements.append(d)
elements.append(Spacer(1, 6*mm))

# --- DETAILED TABLE PER LOCATION ---
elements.append(Paragraph("Daily Breakdown by Location", style_section))
elements.append(HRFlowable(width="100%", thickness=1.5, color=BORDER, spaceAfter=8))

# Build table: header row, then per-location rows, then grand total
col_widths = [22*mm] + [18*mm]*7 + [22*mm]

style_th = ParagraphStyle('TH', fontSize=8, fontName='Helvetica-Bold',
    textColor=WHITE, alignment=TA_CENTER, leading=10)
style_td = ParagraphStyle('TD', fontSize=8.5, fontName='Helvetica',
    textColor=TEXT_PRIMARY, alignment=TA_RIGHT, leading=11)
style_td_loc = ParagraphStyle('TDLoc', fontSize=9, fontName='Helvetica-Bold',
    textColor=NAVY, alignment=TA_LEFT, leading=11)
style_td_total = ParagraphStyle('TDTotal', fontSize=9, fontName='Helvetica-Bold',
    textColor=NAVY, alignment=TA_RIGHT, leading=11)

header_row = [Paragraph('Location', style_th)]
for d in days_order:
    header_row.append(Paragraph(d, style_th))
header_row.append(Paragraph('Total', style_th))

# Wages section
table_data = [header_row]
for loc in location_order:
    row = [Paragraph(loc, style_td_loc)]
    for day in days_order:
        val = locations_data[loc][day]['cost']
        text = f"£{val:,.0f}" if val > 0 else "—"
        row.append(Paragraph(text, style_td))
    row.append(Paragraph(f"£{location_totals[loc]['cost']:,.0f}", style_td_total))
    table_data.append(row)

# Grand total row
grand_row = [Paragraph('TOTAL', style_td_total)]
for day in days_order:
    day_total = sum(locations_data[loc][day]['cost'] for loc in location_order)
    grand_row.append(Paragraph(f"£{day_total:,.0f}", style_td_total))
grand_row.append(Paragraph(f"£{grand_cost:,.0f}", style_td_total))
table_data.append(grand_row)

t = Table(table_data, colWidths=col_widths, repeatRows=1)
t.setStyle(TableStyle([
    # Header
    ('BACKGROUND', (0, 0), (-1, 0), NAVY),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('TOPPADDING', (0, 0), (-1, 0), 7),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 7),
    # Rounded header corners
    ('ROUNDEDCORNERS', [6, 6, 0, 0]),
    # Data rows
    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 1), (-1, -1), 8.5),
    ('TOPPADDING', (0, 1), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    # Alternating row backgrounds
    ('BACKGROUND', (0, 1), (-1, 1), WHITE),
    ('BACKGROUND', (0, 2), (-1, 2), BG_LIGHT),
    ('BACKGROUND', (0, 3), (-1, 3), WHITE),
    ('BACKGROUND', (0, 4), (-1, 4), BG_LIGHT),
    ('BACKGROUND', (0, 5), (-1, 5), WHITE),
    # Grand total row
    ('BACKGROUND', (0, -1), (-1, -1), HexColor('#EBF2FA')),
    ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ('LINEABOVE', (0, -1), (-1, -1), 1.5, NAVY),
    # Grid lines
    ('LINEBELOW', (0, 0), (-1, -2), 0.5, BORDER),
    ('LINEBEFORE', (1, 0), (-1, -1), 0.3, BORDER),
    # Alignment
    ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
    ('ALIGN', (0, 0), (0, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))
elements.append(t)
elements.append(Spacer(1, 4*mm))

# --- HOURS TABLE ---
elements.append(Spacer(1, 4*mm))
elements.append(Paragraph("Hours Breakdown", style_section))
elements.append(HRFlowable(width="100%", thickness=1.5, color=BORDER, spaceAfter=8))

hours_header = [Paragraph('Location', style_th)]
for d in days_order:
    hours_header.append(Paragraph(d, style_th))
hours_header.append(Paragraph('Total', style_th))

hours_data = [hours_header]
for loc in location_order:
    row = [Paragraph(loc, style_td_loc)]
    for day in days_order:
        val = locations_data[loc][day]['hours']
        row.append(Paragraph(f"{val:.1f}", style_td))
    row.append(Paragraph(f"{location_totals[loc]['hours']:.0f}h", style_td_total))
    hours_data.append(row)

grand_hours_row = [Paragraph('TOTAL', style_td_total)]
for day in days_order:
    day_hours = sum(locations_data[loc][day]['hours'] for loc in location_order)
    grand_hours_row.append(Paragraph(f"{day_hours:.1f}", style_td_total))
grand_hours_row.append(Paragraph(f"{grand_hours:.0f}h", style_td_total))
hours_data.append(grand_hours_row)

t2 = Table(hours_data, colWidths=col_widths, repeatRows=1)
t2.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), NAVY),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('TOPPADDING', (0, 0), (-1, 0), 7),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 7),
    ('ROUNDEDCORNERS', [6, 6, 0, 0]),
    ('TOPPADDING', (0, 1), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ('BACKGROUND', (0, 1), (-1, 1), WHITE),
    ('BACKGROUND', (0, 2), (-1, 2), BG_LIGHT),
    ('BACKGROUND', (0, 3), (-1, 3), WHITE),
    ('BACKGROUND', (0, 4), (-1, 4), BG_LIGHT),
    ('BACKGROUND', (0, 5), (-1, 5), WHITE),
    ('BACKGROUND', (0, -1), (-1, -1), HexColor('#EBF2FA')),
    ('LINEABOVE', (0, -1), (-1, -1), 1.5, NAVY),
    ('LINEBELOW', (0, 0), (-1, -2), 0.5, BORDER),
    ('LINEBEFORE', (1, 0), (-1, -1), 0.3, BORDER),
    ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
    ('ALIGN', (0, 0), (0, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))
elements.append(t2)
elements.append(Spacer(1, 6*mm))

# --- CALLOUT ---
callout_data = [[
    Paragraph("KEY OBSERVATIONS", style_callout_title),
], [
    Paragraph(
        "<b>Paddington</b> is the largest cost centre at £3,810 (44% of total), "
        "which is expected as the only B&amp;M location with both FOH and BOH staff. "
        "<b>Shoreditch</b> is second at £2,207 — running nearly 3x the hours of other dark kitchens. "
        "<b>Brent Cross Wednesday</b> shows £0 wages despite 8.5h worked — this indicates a missing pay rate in Deputy and should be investigated. "
        "Average hourly rates vary from £10.58/h (Paddington, mixed grades) to £13.52/h (Wandsworth). "
        "<b>Chiswick</b> has no data as it had not yet launched.",
        style_callout_body
    ),
]]
callout = Table(callout_data, colWidths=[150*mm])
callout.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), HexColor('#EBF2FA')),
    ('LEFTPADDING', (0, 0), (-1, -1), 14),
    ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ('TOPPADDING', (0, 0), (0, 0), 10),
    ('BOTTOMPADDING', (0, -1), (-1, -1), 10),
    ('LINEBELOW', (0, 0), (-1, -1), 0, WHITE),
    ('ROUNDEDCORNERS', [0, 6, 6, 0]),
    ('LINEBEFORE', (0, 0), (0, -1), 3.5, NAVY),
]))
elements.append(callout)

# --- FOOTER ---
elements.append(Spacer(1, 10*mm))
elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=6))
elements.append(Paragraph(
    "IAGTM Agent · Auto-generated report · Data source: Deputy API · Page 1 of 1",
    style_footer
))

# Build
doc.build(elements)
print(f"PDF generated: {output_path}")
