#!/usr/bin/env python3
"""IAGTM Paddington — Turnover vs Staff Cost Report (23 Feb – 1 Mar 2026)"""

import json
from reportlab.lib.colors import HexColor
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable, KeepTogether
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Group
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.legends import Legend

# Brand colors
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

# Load data
import sys
import os

if len(sys.argv) > 1:
    input_path = sys.argv[1]
else:
    input_path = '/tmp/pad-data.json'

if not os.path.exists(input_path):
    print(f"Error: Input file not found: {input_path}", file=sys.stderr)
    print(f"Usage: {sys.argv[0]} <input.json> [output.pdf]", file=sys.stderr)
    sys.exit(1)

with open(input_path) as f:
    data = json.load(f)

daily = data['dailyData']
hourly = data['hourlyData']
totalRev = data['totalRev']
totalCost = data['totalCost']
totalHrs = data['totalHrs']
totalPct = data['totalPct']

# Build PDF
if len(sys.argv) > 2:
    output = sys.argv[2]
else:
    output = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'reports', 'output', 'turnover-vs-labour.pdf')
os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)

doc = SimpleDocTemplate(output, pagesize=A4,
    leftMargin=25*mm, rightMargin=25*mm, topMargin=22*mm, bottomMargin=18*mm)

# Styles
s_brand = ParagraphStyle('Brand', fontSize=11, fontName='Helvetica-Bold',
    textColor=NAVY, leading=14)
s_meta = ParagraphStyle('Meta', fontSize=9, fontName='Helvetica',
    textColor=TEXT_MUTED, alignment=TA_RIGHT, leading=14)
s_title = ParagraphStyle('Title', fontSize=22, fontName='Helvetica-Bold',
    textColor=NAVY, spaceAfter=4, leading=28)
s_subtitle = ParagraphStyle('Sub', fontSize=11, fontName='Helvetica',
    textColor=TEXT_SECONDARY, spaceAfter=16, leading=16)
s_section = ParagraphStyle('Sec', fontSize=14, fontName='Helvetica-Bold',
    textColor=NAVY, spaceBefore=16, spaceAfter=8, leading=18)
s_footer = ParagraphStyle('Footer', fontSize=8, fontName='Helvetica',
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=16)
s_kpi_label = ParagraphStyle('KL', fontSize=8, fontName='Helvetica-Bold',
    textColor=TEXT_MUTED, alignment=TA_CENTER, leading=10)
s_kpi_value = ParagraphStyle('KV', fontSize=20, fontName='Helvetica-Bold',
    textColor=NAVY, alignment=TA_CENTER, leading=24)
s_kpi_sub = ParagraphStyle('KS', fontSize=8, fontName='Helvetica',
    textColor=TEXT_SECONDARY, alignment=TA_CENTER, leading=10)
s_th = ParagraphStyle('TH', fontSize=8, fontName='Helvetica-Bold',
    textColor=WHITE, alignment=TA_CENTER, leading=10)
s_th_left = ParagraphStyle('THL', fontSize=8, fontName='Helvetica-Bold',
    textColor=WHITE, alignment=TA_LEFT, leading=10)
s_td = ParagraphStyle('TD', fontSize=9, fontName='Helvetica',
    textColor=TEXT_PRIMARY, alignment=TA_RIGHT, leading=12)
s_td_left = ParagraphStyle('TDL', fontSize=9, fontName='Helvetica-Bold',
    textColor=NAVY, alignment=TA_LEFT, leading=12)
s_td_total = ParagraphStyle('TDT', fontSize=9, fontName='Helvetica-Bold',
    textColor=NAVY, alignment=TA_RIGHT, leading=12)
s_callout_title = ParagraphStyle('CT', fontSize=9, fontName='Helvetica-Bold',
    textColor=NAVY, spaceAfter=4, leading=12)
s_callout_body = ParagraphStyle('CB', fontSize=9.5, fontName='Helvetica',
    textColor=TEXT_SECONDARY, leading=14, spaceAfter=2)

elements = []

# ============ HEADER ============
header = Table([[
    Paragraph("IT'S ALL GREEK <font color='#C4922A'>TO ME</font>", s_brand),
    Paragraph("Week: 23 Feb — 1 Mar 2026<br/>Paddington — 101 Praed St<br/>Confidential", s_meta),
]], colWidths=[80*mm, 80*mm])
header.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LINEBELOW', (0,0), (-1,0), 2.5, NAVY),
    ('BOTTOMPADDING', (0,0), (-1,0), 12),
]))
elements.append(header)
elements.append(Spacer(1, 6*mm))

elements.append(Paragraph("Turnover vs Staff Cost", s_title))
elements.append(Paragraph("Paddington (FOH + BOH) — hourly and daily breakdown", s_subtitle))

# ============ KPI CARDS ============
def kpi(label, value, sub):
    t = Table([
        [Paragraph(label, s_kpi_label)],
        [Spacer(1, 2*mm)],
        [Paragraph(value, s_kpi_value)],
        [Spacer(1, 1*mm)],
        [Paragraph(sub, s_kpi_sub)],
    ], colWidths=[38*mm])
    t.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    return t

avg_rate = totalCost / totalHrs if totalHrs else 0
rev_per_hr = totalRev / totalHrs if totalHrs else 0

kpi_table = Table([[
    kpi("TURNOVER (EX VAT)", f"£{totalRev:,.0f}", f"£{totalRev/7:,.0f} daily avg"),
    kpi("STAFF COST", f"£{totalCost:,.0f}", f"£{totalCost/7:,.0f} daily avg"),
    kpi("LABOUR %", f"{totalPct:.1f}%", "target: 25–35%"),
    kpi("REV / STAFF HR", f"£{rev_per_hr:.0f}", f"{totalHrs:.0f}h total"),
]], colWidths=[40*mm]*4)
kpi_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
    ('BOX', (0,0), (0,0), 0.5, BORDER),
    ('BOX', (1,0), (1,0), 0.5, BORDER),
    ('BOX', (2,0), (2,0), 0.5, BORDER),
    ('BOX', (3,0), (3,0), 0.5, BORDER),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('TOPPADDING', (0,0), (-1,-1), 10),
    ('BOTTOMPADDING', (0,0), (-1,-1), 10),
]))
elements.append(kpi_table)
elements.append(Spacer(1, 6*mm))

# ============ DAILY BAR CHART ============
elements.append(Paragraph("Daily Turnover vs Staff Cost", s_section))
elements.append(HRFlowable(width="100%", thickness=1.5, color=BORDER, spaceAfter=6))

max_rev = max(d['revenue'] for d in daily)

d_chart = Drawing(160*mm, len(daily) * 14*mm + 2*mm)
y_start = (len(daily) - 1) * 14*mm

for i, row in enumerate(daily):
    y = y_start - i * 14*mm
    rev_w = (row['revenue'] / max_rev * 100*mm) if max_rev > 0 else 0
    cost_w = (row['cost'] / max_rev * 100*mm) if max_rev > 0 else 0

    # Label
    d_chart.add(String(0, y + 3*mm, row['day'], fontSize=9, fontName='Helvetica-Bold', fillColor=NAVY))

    # Revenue bar
    d_chart.add(Rect(26*mm, y + 4*mm, rev_w, 6*mm, fillColor=NAVY, strokeColor=None, rx=2, ry=2))
    # Cost bar (below)
    d_chart.add(Rect(26*mm, y - 1*mm, cost_w, 4*mm, fillColor=GOLD, strokeColor=None, rx=2, ry=2))

    # Values
    d_chart.add(String(26*mm + rev_w + 2*mm, y + 5*mm, f"£{row['revenue']:,.0f}",
        fontSize=8, fontName='Helvetica-Bold', fillColor=NAVY))
    d_chart.add(String(26*mm + cost_w + 2*mm, y - 0.5*mm, f"£{row['cost']:,.0f}",
        fontSize=7, fontName='Helvetica', fillColor=GOLD))

    # Labour %
    pct_color = GREEN if row['labourPct'] <= 25 else (GOLD if row['labourPct'] <= 35 else RED)
    d_chart.add(String(145*mm, y + 2*mm, f"{row['labourPct']:.1f}%",
        fontSize=9, fontName='Helvetica-Bold', fillColor=pct_color))

# Legend
d_chart.add(Rect(0, -6*mm, 8, 4, fillColor=NAVY, strokeColor=None))
d_chart.add(String(4*mm, -5.5*mm, "Revenue (ex VAT)", fontSize=7, fontName='Helvetica', fillColor=TEXT_MUTED))
d_chart.add(Rect(40*mm, -6*mm, 8, 4, fillColor=GOLD, strokeColor=None))
d_chart.add(String(44*mm, -5.5*mm, "Staff Cost", fontSize=7, fontName='Helvetica', fillColor=TEXT_MUTED))
d_chart.add(String(75*mm, -5.5*mm, "% = Labour Cost %", fontSize=7, fontName='Helvetica', fillColor=TEXT_MUTED))

elements.append(d_chart)
elements.append(Spacer(1, 8*mm))

# ============ DAILY TABLE ============
elements.append(Paragraph("Daily Breakdown", s_section))
elements.append(HRFlowable(width="100%", thickness=1.5, color=BORDER, spaceAfter=6))

dt_header = [
    Paragraph('Day', s_th_left),
    Paragraph('Revenue', s_th),
    Paragraph('Staff Cost', s_th),
    Paragraph('Labour %', s_th),
    Paragraph('Staff Hours', s_th),
    Paragraph('Rev/Staff Hr', s_th),
]
dt_data = [dt_header]
for row in daily:
    pct = row['labourPct']
    pct_color = '#27AE60' if pct <= 25 else ('#C4922A' if pct <= 35 else '#C0392B')
    dt_data.append([
        Paragraph(row['day'], s_td_left),
        Paragraph(f"£{row['revenue']:,.0f}", s_td),
        Paragraph(f"£{row['cost']:,.0f}", s_td),
        Paragraph(f"<font color='{pct_color}'><b>{pct:.1f}%</b></font>", s_td),
        Paragraph(f"{row['hours']:.1f}h", s_td),
        Paragraph(f"£{row['revPerHr']:.0f}", s_td),
    ])

# Total row
dt_data.append([
    Paragraph('TOTAL', s_td_total),
    Paragraph(f"£{totalRev:,.0f}", s_td_total),
    Paragraph(f"£{totalCost:,.0f}", s_td_total),
    Paragraph(f"<b>{totalPct:.1f}%</b>", s_td_total),
    Paragraph(f"{totalHrs:.0f}h", s_td_total),
    Paragraph(f"£{totalRev/totalHrs:.0f}", s_td_total),
])

dt_widths = [22*mm, 26*mm, 24*mm, 22*mm, 22*mm, 24*mm]
dt = Table(dt_data, colWidths=dt_widths, repeatRows=1)
dt.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), NAVY),
    ('TOPPADDING', (0,0), (-1,0), 7),
    ('BOTTOMPADDING', (0,0), (-1,0), 7),
    ('ROUNDEDCORNERS', [6,6,0,0]),
    ('TOPPADDING', (0,1), (-1,-1), 6),
    ('BOTTOMPADDING', (0,1), (-1,-1), 6),
    ('BACKGROUND', (0,1), (-1,1), WHITE),
    ('BACKGROUND', (0,2), (-1,2), BG_LIGHT),
    ('BACKGROUND', (0,3), (-1,3), WHITE),
    ('BACKGROUND', (0,4), (-1,4), BG_LIGHT),
    ('BACKGROUND', (0,5), (-1,5), WHITE),
    ('BACKGROUND', (0,6), (-1,6), BG_LIGHT),
    ('BACKGROUND', (0,7), (-1,7), WHITE),
    ('BACKGROUND', (0,-1), (-1,-1), HexColor('#EBF2FA')),
    ('LINEABOVE', (0,-1), (-1,-1), 1.5, NAVY),
    ('LINEBELOW', (0,0), (-1,-2), 0.5, BORDER),
    ('LINEBEFORE', (1,0), (-1,-1), 0.3, BORDER),
    ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
]))
elements.append(dt)
elements.append(Spacer(1, 6*mm))

# ============ HOURLY TABLE ============
elements.append(Paragraph("Hourly Breakdown (Weekly Aggregate)", s_section))
elements.append(HRFlowable(width="100%", thickness=1.5, color=BORDER, spaceAfter=6))

# Filter to meaningful hours (with some revenue or cost)
active_hours = [h for h in hourly if h['revenue'] > 10 or h['cost'] > 10]

ht_header = [
    Paragraph('Hour', s_th_left),
    Paragraph('Revenue', s_th),
    Paragraph('Staff Cost', s_th),
    Paragraph('Labour %', s_th),
    Paragraph('Staff Hrs', s_th),
    Paragraph('Rev/Staff Hr', s_th),
]
ht_data = [ht_header]
for i, row in enumerate(active_hours):
    pct = row['labourPct']
    if pct > 500:
        pct_str = "<font color='#C0392B'><b>n/a</b></font>"
    else:
        pct_color = '#27AE60' if pct <= 25 else ('#C4922A' if pct <= 35 else '#C0392B')
        pct_str = f"<font color='{pct_color}'><b>{pct:.1f}%</b></font>"

    rph = row['revPerStaffHr']
    rph_color = '#27AE60' if rph >= 60 else ('#C4922A' if rph >= 30 else '#C0392B')

    bg = WHITE if i % 2 == 0 else BG_LIGHT
    ht_data.append([
        Paragraph(f"{row['hour']:02d}:00", s_td_left),
        Paragraph(f"£{row['revenue']:,.0f}", s_td),
        Paragraph(f"£{row['cost']:,.0f}", s_td),
        Paragraph(pct_str, s_td),
        Paragraph(f"{row['hours']:.1f}h", s_td),
        Paragraph(f"<font color='{rph_color}'><b>£{rph:.0f}</b></font>", s_td),
    ])

ht = Table(ht_data, colWidths=dt_widths, repeatRows=1)
ht_style = [
    ('BACKGROUND', (0,0), (-1,0), NAVY),
    ('TOPPADDING', (0,0), (-1,0), 7),
    ('BOTTOMPADDING', (0,0), (-1,0), 7),
    ('ROUNDEDCORNERS', [6,6,0,0]),
    ('TOPPADDING', (0,1), (-1,-1), 5),
    ('BOTTOMPADDING', (0,1), (-1,-1), 5),
    ('LINEBELOW', (0,0), (-1,-2), 0.5, BORDER),
    ('LINEBEFORE', (1,0), (-1,-1), 0.3, BORDER),
    ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
]
# Alternating rows
for i in range(1, len(ht_data)):
    bg = WHITE if (i-1) % 2 == 0 else BG_LIGHT
    ht_style.append(('BACKGROUND', (0,i), (-1,i), bg))
ht.setStyle(TableStyle(ht_style))
elements.append(ht)
elements.append(Spacer(1, 6*mm))

# ============ HOURLY BAR CHART ============
elements.append(Paragraph("Revenue vs Staff Cost by Hour", s_section))
elements.append(HRFlowable(width="100%", thickness=1.5, color=BORDER, spaceAfter=6))

# Show hours 9-23 as a stacked horizontal bar
chart_hours = [h for h in active_hours if 9 <= h['hour'] <= 23]
max_hr_rev = max(h['revenue'] for h in chart_hours) if chart_hours else 1

h_chart = Drawing(160*mm, len(chart_hours) * 10*mm + 8*mm)
y_top = (len(chart_hours) - 1) * 10*mm

for i, row in enumerate(chart_hours):
    y = y_top - i * 10*mm
    rev_w = (row['revenue'] / max_hr_rev * 90*mm) if max_hr_rev else 0
    cost_w = (row['cost'] / max_hr_rev * 90*mm) if max_hr_rev else 0

    h_chart.add(String(0, y + 1.5*mm, f"{row['hour']:02d}:00",
        fontSize=8, fontName='Helvetica', fillColor=TEXT_SECONDARY))

    # Revenue bar
    h_chart.add(Rect(18*mm, y, rev_w, 5*mm, fillColor=NAVY, strokeColor=None, rx=2, ry=2))
    # Cost bar overlay
    h_chart.add(Rect(18*mm, y, cost_w, 5*mm, fillColor=GOLD, strokeColor=None, rx=2, ry=2))

    # Value label
    h_chart.add(String(18*mm + rev_w + 2*mm, y + 1*mm,
        f"£{row['revenue']:,.0f}",
        fontSize=7, fontName='Helvetica-Bold', fillColor=NAVY))

    # Labour % on right
    pct = row['labourPct']
    pct_color = GREEN if pct <= 25 else (GOLD if pct <= 35 else RED)
    h_chart.add(String(145*mm, y + 1*mm, f"{pct:.0f}%",
        fontSize=8, fontName='Helvetica-Bold', fillColor=pct_color))

# Legend
h_chart.add(Rect(0, -6*mm, 8, 4, fillColor=NAVY, strokeColor=None))
h_chart.add(String(4*mm, -5.5*mm, "Revenue", fontSize=7, fontName='Helvetica', fillColor=TEXT_MUTED))
h_chart.add(Rect(28*mm, -6*mm, 8, 4, fillColor=GOLD, strokeColor=None))
h_chart.add(String(32*mm, -5.5*mm, "Staff Cost (overlaid)", fontSize=7, fontName='Helvetica', fillColor=TEXT_MUTED))

elements.append(h_chart)
elements.append(Spacer(1, 6*mm))

# ============ CALLOUT ============
# Find peak/trough hours
peak_hr = max(chart_hours, key=lambda h: h['revenue'])
worst_hr = max(chart_hours, key=lambda h: h['labourPct'] if h['labourPct'] < 500 else 0)
best_hr = min(chart_hours, key=lambda h: h['labourPct'] if h['labourPct'] > 0 else 999)

callout = Table([
    [Paragraph("KEY INSIGHTS", s_callout_title)],
    [Paragraph(
        f"<b>Labour cost at {totalPct:.1f}%</b> is well below the B&amp;M target of 25–35%, indicating Paddington "
        f"is running lean for its revenue level. "
        f"<b>Peak revenue hour is {peak_hr['hour']:02d}:00</b> (£{peak_hr['revenue']:,.0f}/week, "
        f"£{peak_hr['revPerStaffHr']:.0f}/staff hr) — this is where each staff member generates the most value. "
        f"<b>{worst_hr['hour']:02d}:00 has the highest labour %</b> at {worst_hr['labourPct']:.0f}% — "
        f"consider staggering shift starts to reduce idle cost before orders ramp up. "
        f"<b>Thursday was the standout day</b> (£{daily[3]['revenue']:,.0f} revenue, just {daily[3]['labourPct']:.1f}% labour). "
        f"<b>Revenue per staff hour ranges from £{min(h['revPerStaffHr'] for h in chart_hours):.0f} to "
        f"£{max(h['revPerStaffHr'] for h in chart_hours):.0f}</b> — the evening peak (18:00–20:00) consistently "
        f"delivers the strongest return per staff hour.",
        s_callout_body
    )],
], colWidths=[160*mm])
callout.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), HexColor('#EBF2FA')),
    ('LEFTPADDING', (0,0), (-1,-1), 14),
    ('RIGHTPADDING', (0,0), (-1,-1), 14),
    ('TOPPADDING', (0,0), (0,0), 10),
    ('BOTTOMPADDING', (0,-1), (-1,-1), 10),
    ('ROUNDEDCORNERS', [0,6,6,0]),
    ('LINEBEFORE', (0,0), (0,-1), 3.5, NAVY),
]))
elements.append(callout)

# ============ FOOTER ============
elements.append(Spacer(1, 8*mm))
elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=4))
elements.append(Paragraph(
    "IAGTM Agent · Auto-generated · Revenue: Lightspeed POS (ex VAT) · Labour: Deputy timesheets",
    s_footer))

doc.build(elements)
print(f"PDF generated: {output}")
