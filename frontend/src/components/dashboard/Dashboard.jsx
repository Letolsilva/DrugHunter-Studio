// components/dashboard/Dashboard.jsx
import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import styles from './Dashboard.module.css'

const QUALIDADE_COR = {
  'Excelente': '#00d4aa',
  'Boa':       '#3b82f6',
  'Razoável':  '#f59e0b',
  'Verificar': '#ef4444',
}

const BADGE = {
  'Excelente': 'badge-excelente',
  'Boa':       'badge-boa',
  'Razoável':  'badge-razoavel',
  'Verificar': 'badge-verificar',
}

export default function Dashboard({ dados, proteinas, onNovaBusca, inputOriginal }) {
  const [filtroOrganismo, setFiltroOrganismo] = useState('')
  const [filtroProteina,  setFiltroProteina]  = useState('')
  const [filtroQualidade, setFiltroQualidade] = useState('')
  const [filtroLigante,   setFiltroLigante]   = useState('')
  const [busca,           setBusca]           = useState('')
  const [ordem,           setOrdem]           = useState('resolucao')
  const [pagina,          setPagina]          = useState(1)
  const POR_PAGINA = 20

  // Organismos únicos nos resultados
  const organismos = useMemo(() => {
    const set = new Set()
    dados.forEach(d => {
      if (d.organismo) d.organismo.split('|').forEach(o => {
        const t = o.trim(); if (t && t !== 'N/A') set.add(t)
      })
    })
    return [...set].sort()
  }, [dados])

  // Dados filtrados
  const filtrados = useMemo(() => {
    let r = dados
    if (filtroOrganismo) r = r.filter(d => d.organismo?.includes(filtroOrganismo))
    if (filtroProteina)  r = r.filter(d => d.proteina_buscada === filtroProteina)
    if (filtroQualidade) r = r.filter(d => d.qualidade === filtroQualidade)
    if (filtroLigante === 'sim') r = r.filter(d => d.tem_ligante)
    if (filtroLigante === 'nao') r = r.filter(d => !d.tem_ligante)
    if (busca) {
      const q = busca.toLowerCase()
      r = r.filter(d =>
        d.pdb_id?.toLowerCase().includes(q) ||
        d.titulo?.toLowerCase().includes(q) ||
        d.organismo?.toLowerCase().includes(q)
      )
    }
    return [...r].sort((a, b) => {
      if (ordem === 'resolucao') return (a.resolucao || 99) - (b.resolucao || 99)
      if (ordem === 'qualidade') {
        const ord = ['Excelente','Boa','Razoável','Verificar']
        return ord.indexOf(a.qualidade) - ord.indexOf(b.qualidade)
      }
      if (ordem === 'data') return (b.depositado_em || '').localeCompare(a.depositado_em || '')
      return 0
    })
  }, [dados, filtroOrganismo, filtroProteina, filtroQualidade, filtroLigante, busca, ordem])

  const paginas     = Math.ceil(filtrados.length / POR_PAGINA)
  const paginaAtual = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  // Dados para gráficos
  const dadosQualidade = useMemo(() => {
    const c = {}
    filtrados.forEach(d => { c[d.qualidade] = (c[d.qualidade] || 0) + 1 })
    return Object.entries(c).map(([name, value]) => ({ name, value }))
  }, [filtrados])

  const dadosMetodo = useMemo(() => {
    const c = {}
    filtrados.forEach(d => { if (d.metodo) c[d.metodo] = (c[d.metodo] || 0) + 1 })
    return Object.entries(c)
      .sort((a,b) => b[1]-a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.length > 18 ? name.slice(0,16)+'…' : name, value }))
  }, [filtrados])

  const dadosProteina = useMemo(() => {
    const c = {}
    filtrados.forEach(d => { if (d.proteina_buscada) c[d.proteina_buscada] = (c[d.proteina_buscada]||0)+1 })
    return Object.entries(c).map(([name, value]) => ({ name, value }))
  }, [filtrados])

  // Download CSV
  const downloadCSV = () => {
    const cols = ['pdb_id','proteina_buscada','titulo','organismo','classificacao',
                  'resolucao','metodo','tem_ligante','num_cadeias','ramachandran',
                  'depositado_em','qualidade','link_pdb']
    const rows = [cols.join(',')]
    filtrados.forEach(d => {
      rows.push(cols.map(c => {
        const v = c === 'tem_ligante' ? (d[c] ? 'Sim' : 'Não') : (d[c] ?? '')
        return `"${String(v).replace(/"/g,'""')}"`
      }).join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'pdb_resultados.csv' })
    a.click(); URL.revokeObjectURL(url)
  }

  const limparFiltros = () => {
    setFiltroOrganismo(''); setFiltroProteina('')
    setFiltroQualidade(''); setFiltroLigante('')
    setBusca(''); setPagina(1)
  }

  return (
    <div className={styles.dashboard + ' fade-in'}>

      {/* Header de resultado */}
      <div className={styles.resultHeader}>
        <div>
          <h2 className={styles.resultTitle}>
            {dados.length} estruturas coletadas
          </h2>
          <p className={styles.resultSub}>
            {proteinas.join(', ')}
          </p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn-ghost" onClick={downloadCSV} style={{fontSize:13,padding:'8px 16px'}}>
            ⬇ CSV
          </button>
          <button className="btn-primary" onClick={onNovaBusca} style={{fontSize:13,padding:'8px 16px'}}>
            + Nova busca
          </button>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className={styles.statsRow}>
        {[
          { label: 'Total',         value: dados.length },
          { label: 'Com ligante',   value: dados.filter(d=>d.tem_ligante).length },
          { label: 'Excelente',     value: dados.filter(d=>d.qualidade==='Excelente').length },
          { label: 'Organismos',    value: organismos.length },
          { label: 'Resolução mín', value: Math.min(...dados.filter(d=>d.resolucao).map(d=>d.resolucao)).toFixed(2) + ' Å' },
        ].map(s => (
          <div key={s.label} className={styles.statCard}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className={styles.charts}>
        {/* Qualidade — Pie */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Distribuição de Qualidade</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={dadosQualidade}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                outerRadius={72}
                strokeWidth={0}
              >
                {dadosQualidade.map(entry => (
                  <Cell key={entry.name} fill={QUALIDADE_COR[entry.name] || '#4d6a8a'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                itemStyle={{ color:'var(--text)' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: 'var(--text-2)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Método — Bar */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Método Experimental</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dadosMetodo} layout="vertical" margin={{left:8}}>
              <XAxis type="number" tick={{ fontSize:11, fill:'var(--text-3)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize:11, fill:'var(--text-2)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                itemStyle={{ color:'var(--text)' }}
              />
              <Bar dataKey="value" fill="var(--accent)" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Por proteína — Bar (só se múltiplas) */}
        {proteinas.length > 1 && (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Estruturas por Proteína</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dadosProteina}>
                <XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--text-2)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:'var(--text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                  itemStyle={{ color:'var(--text)' }}
                />
                <Bar dataKey="value" fill="var(--blue)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className={styles.filters}>
        <input
          placeholder="🔍 Buscar por ID, título ou organismo..."
          value={busca}
          onChange={e => { setBusca(e.target.value); setPagina(1) }}
          style={{flex:2, minWidth:200}}
        />

        <select
          value={filtroOrganismo}
          onChange={e => { setFiltroOrganismo(e.target.value); setPagina(1) }}
          style={{flex:1, minWidth:140}}
        >
          <option value="">Todos os organismos</option>
          {organismos.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        {proteinas.length > 1 && (
          <select
            value={filtroProteina}
            onChange={e => { setFiltroProteina(e.target.value); setPagina(1) }}
            style={{flex:1, minWidth:140}}
          >
            <option value="">Todas as proteínas</option>
            {proteinas.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}

        <select
          value={filtroQualidade}
          onChange={e => { setFiltroQualidade(e.target.value); setPagina(1) }}
          style={{minWidth:130}}
        >
          <option value="">Toda qualidade</option>
          {['Excelente','Boa','Razoável','Verificar'].map(q =>
            <option key={q} value={q}>{q}</option>
          )}
        </select>

        <select
          value={filtroLigante}
          onChange={e => { setFiltroLigante(e.target.value); setPagina(1) }}
          style={{minWidth:120}}
        >
          <option value="">Ligante: todos</option>
          <option value="sim">Com ligante</option>
          <option value="nao">Sem ligante</option>
        </select>

        <select value={ordem} onChange={e => setOrdem(e.target.value)} style={{minWidth:130}}>
          <option value="resolucao">↑ Resolução</option>
          <option value="qualidade">↑ Qualidade</option>
          <option value="data">↓ Data</option>
        </select>

        {(filtroOrganismo||filtroProteina||filtroQualidade||filtroLigante||busca) && (
          <button className="btn-ghost" onClick={limparFiltros} style={{padding:'8px 12px',fontSize:12,whiteSpace:'nowrap'}}>
            ✕ Limpar
          </button>
        )}
      </div>

      <div className={styles.filtradosInfo}>
        Exibindo <b>{filtrados.length}</b> de <b>{dados.length}</b> estruturas
      </div>

      {/* Tabela */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>PDB ID</th>
              <th>Título</th>
              <th>Organismo</th>
              <th>Proteína</th>
              <th>Resolução</th>
              <th>Método</th>
              <th>Qualidade</th>
              <th>Ligante</th>
              <th>Cadeias</th>
              <th>Data</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {paginaAtual.map(d => (
              <tr key={d.pdb_id}>
                <td>
                  <a href={d.link_pdb} target="_blank" rel="noreferrer"
                     className={styles.pdbLink}>
                    {d.pdb_id}
                  </a>
                </td>
                <td className={styles.titulo}>{d.titulo || '—'}</td>
                <td className={styles.organismo}>{d.organismo || '—'}</td>
                <td>
                  <span style={{fontSize:11,color:'var(--text-3)',fontFamily:'var(--font-mono)'}}>
                    {d.proteina_buscada}
                  </span>
                </td>
                <td style={{fontFamily:'var(--font-mono)', fontSize:13}}>
                  {d.resolucao ? `${d.resolucao} Å` : '—'}
                </td>
                <td style={{fontSize:12,color:'var(--text-2)'}}>{d.metodo || '—'}</td>
                <td>
                  <span className={`badge ${BADGE[d.qualidade] || ''}`}>
                    {d.qualidade || '—'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${d.tem_ligante ? 'badge-ligante' : 'badge-sem-ligante'}`}>
                    {d.tem_ligante ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td style={{fontFamily:'var(--font-mono)', fontSize:13, textAlign:'center'}}>
                  {d.num_cadeias ?? '—'}
                </td>
                <td style={{fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-3)'}}>
                  {d.depositado_em || '—'}
                </td>
                <td style={{textAlign:'center'}}>
                  {d.link_pdb
                    ? <a href={d.link_pdb} target="_blank" rel="noreferrer" className={styles.linkBtn} title="Abrir no RCSB PDB">
                        ↗
                      </a>
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {paginas > 1 && (
        <div className={styles.paginacao}>
          <button className="btn-ghost" onClick={() => setPagina(p => Math.max(1,p-1))}
                  disabled={pagina===1} style={{padding:'6px 14px',fontSize:13}}>
            ← Anterior
          </button>
          <span style={{fontSize:13,color:'var(--text-2)'}}>
            Página <b>{pagina}</b> de <b>{paginas}</b>
          </span>
          <button className="btn-ghost" onClick={() => setPagina(p => Math.min(paginas,p+1))}
                  disabled={pagina===paginas} style={{padding:'6px 14px',fontSize:13}}>
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}
