
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PLUGIN_DIR = path.join(__dirname, 'plugins').endsWith('plugins/plugins')
  ? path.join(__dirname, 'plugins')
  : __dirname

const CATEGORIAS = {
  admin: '🛡️ ADMINISTRACIÓN',
  grupo: '👥 GRUPOS',
  group: '👥 GRUPOS',
  descargas: '📥 DESCARGAS',
  downloads: '📥 DESCARGAS',
  multi: '🎨 MULTIMEDIA',
  multimedia: '🎨 MULTIMEDIA',
  tools: '🧰 HERRAMIENTAS',
  herramientas: '🧰 HERRAMIENTAS',
  funny: '🎮 ENTRETENIMIENTO',
  info: '📚 INFORMACIÓN',
  onoff: '⚙️ CONFIGURACIÓN',
  owner: '👑 OWNER',
  ventas: '💰 VENTAS',
  hot: '🔞 +18',
  premium: '💎 PREMIUM'
}

const ORDEN = [
  'admin',
  'grupo',
  'descargas',
  'multi',
  'tools',
  'funny',
  'info',
  'onoff',
  'owner',
  'ventas',
  'premium',
  'hot'
]

function normalizarComandos(plugin) {
  let comandos = []

  if (Array.isArray(plugin.commands)) {
    comandos.push(...plugin.commands)
  }

  if (typeof plugin.command === 'string') {
    comandos.push(plugin.command)
  } else if (Array.isArray(plugin.command)) {
    comandos.push(...plugin.command)
  }

  if (typeof plugin.cmd === 'string') {
    comandos.push(plugin.cmd)
  } else if (Array.isArray(plugin.cmd)) {
    comandos.push(...plugin.cmd)
  }

  if (Array.isArray(plugin.aliases)) {
    comandos.push(...plugin.aliases)
  }

  return [...new Set(
    comandos
      .filter(c => typeof c === 'string' && c.trim())
      .map(c => c.trim().replace(/^[.!/#]+/, '').toLowerCase())
  )]
}

function normalizarCategoria(categoria) {
  const cat = String(categoria || 'info')
    .toLowerCase()
    .trim()

  const equivalencias = {
    group: 'grupo',
    downloads: 'descargas',
    multimedia: 'multi',
    herramientas: 'tools',
    entretenimiento: 'funny',
    configuracion: 'onoff',
    premium: 'premium'
  }

  return equivalencias[cat] || cat
}

async function buscarPlugins(directorio) {
  let archivos = []

  try {
    const elementos = await fs.readdir(directorio, {
      withFileTypes: true
    })

    for (const elemento of elementos) {
      const ruta = path.join(directorio, elemento.name)

      if (elemento.isDirectory()) {
        if (
          elemento.name === 'node_modules' ||
          elemento.name.startsWith('.')
        ) continue

        archivos.push(...await buscarPlugins(ruta))
      } else if (
        elemento.isFile() &&
        elemento.name.endsWith('.js') &&
        elemento.name !== 'menu.js'
      ) {
        archivos.push(ruta)
      }
    }
  } catch (error) {
    console.error('Error leyendo plugins:', error)
  }

  return archivos
}

async function cargarComandos() {
  const categorias = {}

  for (const categoria of ORDEN) {
    categorias[categoria] = new Set()
  }

  const archivos = await buscarPlugins(PLUGIN_DIR)

  for (const archivo of archivos) {
    try {
      const stats = await fs.stat(archivo)

      const url = pathToFileURL(archivo).href +
        `?v=${stats.mtimeMs}`

      const modulo = await import(url)
      const plugin = modulo.default || modulo

      if (!plugin || typeof plugin !== 'object') continue

      const comandos = normalizarComandos(plugin)

      if (!comandos.length) continue

      let categoria = normalizarCategoria(plugin.category)

      if (!categorias[categoria]) {
        categoria = 'info'
      }

      for (const comando of comandos) {
        categorias[categoria].add(comando)
      }

    } catch (error) {
      console.error(
        `Error cargando plugin ${path.basename(archivo)}:`,
        error.message
      )
    }
  }

  return categorias
}

export default {
  commands: ['menu', 'help'],
  category: 'info',

  async run(sock, msg, args, ctx) {
    const jid = ctx?.jid || msg?.key?.remoteJid
    if (!jid) return

    try {
      const categorias = await cargarComandos()

      let total = 0
      let contenido = ''

      for (const categoria of ORDEN) {
        const comandos = [...categorias[categoria]]

        if (!comandos.length) continue

        total += comandos.length

        const titulo = CATEGORIAS[categoria]

        const lista = comandos
          .sort()
          .map(comando => `  › .${comando}`)
          .join('\n')

        contenido += `\n╭━━〔 ${titulo} 〕\n`
        contenido += `${lista}\n`
        contenido += `╰━━━━━━━━━━━━━━\n`
      }

      if (total === 0) {
        return sock.sendMessage(
          jid,
          {
            text: '❌ No se encontraron comandos registrados en la carpeta plugins.'
          },
          { quoted: msg }
        )
      }

      const texto = `╭━━━〔 🤖 〕━━━╮
     𝗦𝗢𝗡𝗜𝗖𝗕𝗢𝗧 𝗣𝗥𝗢
╰━━━━━━━━━━━━━━╯

🌙 ¡GOOD NIGHT! ☁️

👋 Hola @Orlando157

╭━━〔 📌 INFORMACIÓN 〕
│
│ 🤖 Bot: SonicBot Pro
│ ⚡ Estado: Funcionando
│ 📚 Comandos: ${total}
│ 📂 Categorías: ${ORDEN.filter(c => categorias[c].size > 0).length}
│ 🔹 Prefijo: .
│
╰━━━━━━━━━━━━━━

${contenido}
╭━━〔 📸 REDES 〕
│ Instagram:
│ instagram.com/orland0157
│
│ 💬 Envía un mensaje para ayuda
╰━━━━━━━━━━━━━━

       𝗦𝗢𝗡𝗜𝗖𝗕𝗢𝗧 𝗣𝗥𝗢 🤖`

      await sock.sendMessage(
        jid,
        { text: texto },
        { quoted: msg }
      )

    } catch (error) {
      console.error('Error en menú:', error)

      await sock.sendMessage(
        jid,
        { text: '❌ Ocurrió un error al generar el menú.' },
        { quoted: msg }
      )
    }
  }
}
