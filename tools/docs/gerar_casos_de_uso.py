#!/usr/bin/env python3
"""Gera o diagrama UML de casos de uso (SVG) sem depender de motor de layout.
Os ovais têm a mesma largura e ficam alinhados, então as associações (linhas) não cruzam outros casos de uso.
Saída: docs/assets/diagramas/svg/06-casos-de-uso.svg  (o PNG é gerado por render-diagramas.sh)."""
from pathlib import Path
from xml.sax.saxutils import escape

# (id, texto, atores que participam: P=Pesquisador, A=Administrador, S=SMTP)
UCS = [
    ("UC01", "Cadastrar e autenticar", "P"), ("UC02", "Buscar estruturas PDB por proteína-alvo", "P"),
    ("UC03", "Filtrar e exportar resultados da busca", "P"), ("UC04", "Baixar arquivo PDB/CIF", "P"),
    ("UC05", "Selecionar ligantes na árvore de resíduos", "P"), ("UC06", "Executar redocking", "PS"),
    ("UC07", "Coletar bioatividade (ChEMBL)", "P"), ("UC08", "Analisar similaridade entre moléculas", "P"),
    ("UC09", "Avaliar ADMET", "P"), ("UC10", "Agrupar moléculas (clustering)", "P"),
    ("UC11", "Executar docking de consenso", "PS"), ("UC12", "Treinar modelo NeuroDock", "PS"),
    ("UC13", "Realizar triagem virtual", "PS"), ("UC14", "Simular dinâmica molecular", "PS"),
    ("UC15", "Analisar trajetória de simulação", "PS"), ("UC16", "Consultar histórico de buscas", "P"),
    ("UC17", "Validar ambiente e consultar ajuda", "P"), ("UC18", "Configurar DrugHunter, SMTP e cache", "A"),
    ("UC19", "Gerenciar usuários", "A"),
]
W, H, GAP = 380, 38, 16
X0, Y0 = 330, 70                      # canto do primeiro oval
H_TOTAL = Y0 + len(UCS) * (H + GAP) + 130
W_TOTAL = 1060
cy = lambda i: Y0 + i * (H + GAP) + H / 2
left, right = X0, X0 + W

out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W_TOTAL}" height="{H_TOTAL}" viewBox="0 0 {W_TOTAL} {H_TOTAL}" font-family="Arial, Helvetica, sans-serif">',
       f'<rect width="100%" height="100%" fill="white"/>',
       '<defs><marker id="tri" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M1,1 L11,6 L1,11 z" fill="white" stroke="#333"/></marker></defs>',
       f'<rect x="{X0-45}" y="20" width="{W+90}" height="{len(UCS)*(H+GAP)+70}" rx="14" fill="#fafafa" stroke="#1e3a8a" stroke-width="2"/>',
       f'<text x="{X0+W/2}" y="46" text-anchor="middle" font-size="17" font-weight="bold" fill="#1e3a8a">DrugHunter Studio</text>']

def actor(x, y, nome, cor="#dbeafe"):
    # boneco palito UML + rótulo
    return (f'<g stroke="#333" stroke-width="2" fill="{cor}"><circle cx="{x}" cy="{y-34}" r="11"/>'
            f'<line x1="{x}" y1="{y-23}" x2="{x}" y2="{y+10}"/><line x1="{x-18}" y1="{y-12}" x2="{x+18}" y2="{y-12}"/>'
            f'<line x1="{x}" y1="{y+10}" x2="{x-16}" y2="{y+34}"/><line x1="{x}" y1="{y+10}" x2="{x+16}" y2="{y+34}"/></g>'
            f'<text x="{x}" y="{y+54}" text-anchor="middle" font-size="14" font-weight="bold">{escape(nome)}</text>')

ap = (95, (cy(0) + cy(16)) / 2)       # Pesquisador: centro do bloco UC01-UC17
aa = (95, cy(18) + 40)           # Administrador abaixo
as_ = (W_TOTAL - 85, (cy(5) + cy(14)) / 2)  # SMTP à direita
# generalização Administrador -> Pesquisador
out.append(f'<line x1="{aa[0]}" y1="{aa[1]-40}" x2="{ap[0]}" y2="{ap[1]+64}" stroke="#333" stroke-width="1.6" marker-end="url(#tri)"/>')
out.append(f'<text x="{ap[0]+8}" y="{(aa[1]+ap[1])/2+30}" font-size="11" fill="#555">generalização</text>')

for i, (uid, txt, quem) in enumerate(UCS):
    y = cy(i)
    if "P" in quem:
        out.append(f'<line x1="{ap[0]+18}" y1="{ap[1]-12}" x2="{left}" y2="{y}" stroke="#666" stroke-width="1"/>')
    if "A" in quem:
        out.append(f'<line x1="{aa[0]+18}" y1="{aa[1]-12}" x2="{left}" y2="{y}" stroke="#666" stroke-width="1"/>')
    if "S" in quem:
        out.append(f'<line x1="{right}" y1="{y}" x2="{as_[0]-18}" y2="{as_[1]-12}" stroke="#666" stroke-width="1" stroke-dasharray="3 3"/>')
for i, (uid, txt, quem) in enumerate(UCS):
    y = cy(i)
    out.append(f'<ellipse cx="{X0+W/2}" cy="{y}" rx="{W/2}" ry="{H/2}" fill="#f3f4f6" stroke="#6b7280" stroke-width="1.2"/>')
    out.append(f'<text x="{X0+W/2}" y="{y+4.5}" text-anchor="middle" font-size="13"><tspan font-weight="bold">{uid}</tspan> {escape(txt)}</text>')

out.append(actor(*ap, "Pesquisador")); out.append(actor(*aa, "Administrador"))
out.append(actor(*as_, "Servidor SMTP", "#e5e7eb"))
out.append(f'<text x="{as_[0]}" y="{as_[1]+70}" text-anchor="middle" font-size="11" fill="#555">(ator externo; aviso de conclusão)</text>')
out.append("</svg>")

dest = Path(__file__).resolve().parents[2] / "docs/assets/diagramas/svg/06-casos-de-uso.svg"
dest.parent.mkdir(parents=True, exist_ok=True); dest.write_text("\n".join(out), encoding="utf-8")
print("ok:", dest)
