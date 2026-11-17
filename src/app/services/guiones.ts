import { Injectable, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface MensajeChat {
  rol: 'user' | 'assistant';
  contenido: string;
  timestamp: Date;
  esGuion?: boolean;
}

export interface EstudioInternet {
  nivelTendencia: 'Alza' | 'Estable' | 'Saturado' | 'Sin demanda';
  volumenBusquedaEstimado: string;
  palabrasClaveRelacionadas: string[];
  fuentesDetectadas: { titulo: string; resumen: string }[];
  veredictoMercado: string;
}

export interface GuionItem {
  id: string;
  tema: string;
  guion: string;
  guionFormateado?: string;
  probabilidadViral: number;
  estadoVideo?: 'pendiente' | 'generando' | 'listo' | 'error';
  videoUrl?: string;
  factoresVirales: {
    gancho: number;
    retencion: number;
    emocion: number;
    llamadoAccion: number;
  };
  justificacionScore?: string;
  mensajes: MensajeChat[];
  estudioWeb?: EstudioInternet;
  estado: 'borrador' | 'aprobado' | 'descartado';
  fecha: Date;
}

@Injectable({ providedIn: 'root' })
export class GuionesService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private lmStudioUrl = 'http://localhost:1235/v1/chat/completions';
  private n8nSearchWebhookUrl = 'http://localhost:5678/webhook/estudio-viral';
  private n8nVideoWebhookUrl = 'http://localhost:5678/webhook/generar-video';
  private modelId = 'qwen3.5-9b-uncensored-hauhaucs-aggressive.gguf';

  historialSesiones = signal<GuionItem[]>(this.cargarHistorial());
  guionesAprobados = signal<GuionItem[]>(this.cargarAprobados());

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('historial_sesiones_ia', JSON.stringify(this.historialSesiones()));
      }
    });

    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('guiones_aprobados', JSON.stringify(this.guionesAprobados()));
      }
    });
  }

  private cargarHistorial(): GuionItem[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    const data = localStorage.getItem('historial_sesiones_ia');
    return data ? JSON.parse(data) : [];
  }

  private cargarAprobados(): GuionItem[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    const data = localStorage.getItem('guiones_aprobados');
    return data ? JSON.parse(data) : [];
  }

  // Convierte cualquier formato (string, objeto o array) en texto limpio sin [object Object]
  private normalizarTextoGuion(valor: unknown): string {
    if (typeof valor === 'string') return valor.trim();
    if (Array.isArray(valor)) {
      return valor.map((item) => this.normalizarTextoGuion(item)).join('\n\n');
    }
    if (valor && typeof valor === 'object') {
      return Object.entries(valor)
        .map(([clave, val]) => `${clave.toUpperCase()}:\n${this.normalizarTextoGuion(val)}`)
        .join('\n\n');
    }
    return String(valor ?? '');
  }

  // Extrae JSON limpio soportando bloques <think>, reasoning_content y Assistant Prefill '{'
  private extraerJsonSeguro(resp: any): any {
    const msg = resp?.choices?.[0]?.message;
    const raw = (msg?.content || msg?.reasoning_content || msg?.reasoning || '').trim();
    const sinThink = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    const candidato = sinThink.startsWith('{') ? sinThink : `{${sinThink}`;
    const inicio = candidato.indexOf('{');
    const fin = candidato.lastIndexOf('}');

    if (inicio === -1 || fin === -1) {
      console.error('Respuesta completa sin JSON válido:', resp);
      throw new Error('La respuesta del modelo no contiene un objeto JSON válido.');
    }

    return JSON.parse(candidato.slice(inicio, fin + 1));
  }

  // Obtiene titulares frescos de Google News RSS desde n8n antes de redactar o analizar
  private async consultarContextoWeb(tema: string): Promise<string> {
    try {
      const resN8n: any = await firstValueFrom(
        this.http.post(this.n8nSearchWebhookUrl, { tema })
      );
      return resN8n?.resumenPrincipal || '';
    } catch (error) {
      console.warn('Webhook n8n no disponible, continuando sin datos web externos:', error);
      return '';
    }
  }

  // 1. Generar guion de 30 segundos (alta dopamina / retención) anclado con noticias reales de n8n
  async generarOIterarGuion(
    sesionActual: GuionItem | null,
    mensajeUsuario: string
  ): Promise<GuionItem> {
    const historialPrevio = sesionActual
      ? sesionActual.mensajes.slice(-4).map((m) => ({ role: m.rol, content: m.contenido }))
      : [];

    const fechaActual = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const temaBusqueda = sesionActual ? sesionActual.tema : mensajeUsuario;
    const datosActualizados = await this.consultarContextoWeb(temaBusqueda);

    const bloqueContextoReal = datosActualizados
      ? `TITULARES REALES EXTRAÍDOS DE GOOGLE NEWS HOY (${fechaActual}):\n${datosActualizados}\nREGLA CRÍTICA: Usa EXCLUSIVAMENTE los datos y fechas verificados arriba. Prohibido inventar fechas pasadas ni detalles ficticios.`
      : `FECHA ACTUAL: ${fechaActual}.\nREGLA CRÍTICA: No tienes acceso a internet en este momento; si el tema trata sobre lanzamientos o noticias recientes, NO inventes fechas ni datos no confirmados.`;

    const promptSistema = `Eres un guionista maestro de retención viral para Reels, TikTok y YouTube Shorts especializado en formato explosivo de 30 SEGUNDOS (75 a 85 palabras narradas con ritmo rápido, cero relleno).

${bloqueContextoReal}

Arquitectura obligatoria de 30 segundos (alta dopamina):
1. [0-3s] GANCHO DE CHOQUE: Frase disruptiva y verídica que detenga el scroll al instante (máx. 12 palabras).
2. [3-8s] BUCLE ABIERTO: Tensión o dato real poco conocido que solo se resuelve en el segundo 25.
3. [8-22s] MICRO-RECOMPENSAS Y GIRO: Dos golpes de valor reales cada 6 segundos + un giro inesperado. Incluye indicaciones breves de [VISUAL] y [VOZ].
4. [22-30s] CLÍMAX Y LOOP INFINITO: Resolución impactante + frase final que enlace gramaticalmente con la primera palabra del video para provocar repetición automática.

Rúbrica de evaluación (NO infles puntajes):
- Si el tema es vago o de una sola palabra sin contexto (ej. "Hola", "Prueba"), asigna entre 10 y 25 puntos.
- Solo asigna más de 75 puntos si el tema permite construir un conflicto claro, curiosidad real y alto valor percibido.
- El campo "guion" DEBE ser una cadena de texto plano (string) limpia con saltos de línea, nunca un objeto anidado.

Responde ÚNICAMENTE con un JSON válido (sin markdown) con esta estructura:
{
  "guion": "DURACIÓN: 30s (80 palabras) | RITMO: Explosivo\\n\\n[0-3s] GANCHO:\\n...\\n\\n[3-8s] BUCLE ABIERTO:\\n...\\n\\n[8-22s] DESARROLLO & GIRO:\\n...\\n\\n[22-30s] CLÍMAX & LOOP FINAL:\\n...",
  "factoresVirales": {
    "gancho": 0,
    "retencion": 0,
    "emocion": 0,
    "llamadoAccion": 0
  },
  "justificacionScore": "Diagnóstico crítico de 1 línea sobre retención y precisión factual"
}`;

    const body = {
      model: this.modelId,
      messages: [
        { role: 'system', content: promptSistema },
        ...historialPrevio,
        { role: 'user', content: mensajeUsuario },
        { role: 'assistant', content: '{' }
      ],
      temperature: 0.45,
      max_tokens: 1300
    };

    try {
      const resp: any = await firstValueFrom(this.http.post(this.lmStudioUrl, body));
      const parsed = this.extraerJsonSeguro(resp);

      const textoGuion = this.normalizarTextoGuion(parsed.guion);
      const f = {
        gancho: Math.min(100, Math.max(0, Number(parsed.factoresVirales?.gancho ?? 20))),
        retencion: Math.min(100, Math.max(0, Number(parsed.factoresVirales?.retencion ?? 20))),
        emocion: Math.min(100, Math.max(0, Number(parsed.factoresVirales?.emocion ?? 20))),
        llamadoAccion: Math.min(100, Math.max(0, Number(parsed.factoresVirales?.llamadoAccion ?? 20)))
      };

      const probabilidadCalculada = Math.round(
        f.gancho * 0.35 + f.retencion * 0.3 + f.emocion * 0.2 + f.llamadoAccion * 0.15
      );

      const nuevoMsgUser: MensajeChat = {
        rol: 'user',
        contenido: mensajeUsuario,
        timestamp: new Date()
      };

      const nuevoMsgIA: MensajeChat = {
        rol: 'assistant',
        contenido: textoGuion,
        timestamp: new Date(),
        esGuion: true
      };

      const sesionActualizada: GuionItem = sesionActual
        ? {
            ...sesionActual,
            guion: textoGuion,
            probabilidadViral: probabilidadCalculada,
            factoresVirales: f,
            justificacionScore: parsed.justificacionScore || '',
            mensajes: [...sesionActual.mensajes, nuevoMsgUser, nuevoMsgIA],
            fecha: new Date()
          }
        : {
            id: crypto.randomUUID(),
            tema: mensajeUsuario.slice(0, 65),
            guion: textoGuion,
            probabilidadViral: probabilidadCalculada,
            factoresVirales: f,
            justificacionScore: parsed.justificacionScore || '',
            mensajes: [nuevoMsgUser, nuevoMsgIA],
            estado: 'borrador',
            fecha: new Date()
          };

      this.guardarEnHistorial(sesionActualizada);
      return sesionActualizada;
    } catch (err: any) {
      console.error('Error en generarOIterarGuion:', err?.error || err);
      throw err;
    }
  }

  // Alias de compatibilidad
  enviarMensajeChat(sesionActual: GuionItem | null, mensajeUsuario: string): Promise<GuionItem> {
    return this.generarOIterarGuion(sesionActual, mensajeUsuario);
  }

  // 2. Estudio de mercado en internet vía n8n + síntesis crítica
  async estudiarTemaEnInternet(sesion: GuionItem): Promise<EstudioInternet> {
    const titulares = await this.consultarContextoWeb(sesion.tema);
    const contextoWeb = titulares
      ? `Titulares reales de Google News hoy:\n${titulares}`
      : 'Sin datos externos de n8n; evalúa basándote en intención de búsqueda actual.';

    const promptEstudio = `Analiza con objetividad la demanda de búsqueda y actualidad en internet para el tema "${sesion.tema}".
${contextoWeb}
Si el tema es demasiado genérico o sin intención de búsqueda clara, indícalo con honestidad.

Responde ÚNICAMENTE con JSON válido sin markdown:
{
  "nivelTendencia": "Alza | Estable | Saturado | Sin demanda",
  "volumenBusquedaEstimado": "Estimación realista basada en las noticias detectadas",
  "palabrasClaveRelacionadas": ["keyword1", "keyword2", "keyword3"],
  "fuentesDetectadas": [
    { "titulo": "Hallazgo principal en prensa", "resumen": "Síntesis breve y factual de lo que dicen los titulares" }
  ],
  "veredictoMercado": "Diagnóstico directo sobre si conviene grabar este tema ahora o pivotar"
}`;

    const body = {
      model: this.modelId,
      messages: [
        { role: 'system', content: 'Responde exclusivamente con un objeto JSON válido.' },
        { role: 'user', content: promptEstudio },
        { role: 'assistant', content: '{' }
      ],
      temperature: 0.3,
      max_tokens: 900
    };

    try {
      const resp: any = await firstValueFrom(this.http.post(this.lmStudioUrl, body));
      const estudio: EstudioInternet = this.extraerJsonSeguro(resp);
      this.guardarEnHistorial({ ...sesion, estudioWeb: estudio });
      return estudio;
    } catch (err: any) {
      console.error('Error en estudiarTemaEnInternet:', err?.error || err);
      throw err;
    }
  }

  // 3. Formateo editorial final al aprobar
  async formatearGuionConIA(guionCrudo: string): Promise<string> {
    const body = {
      model: this.modelId,
      messages: [
        {
          role: 'system',
          content:
            'Eres un editor de guiones audiovisuales. Estructura este guion de 30 segundos de forma clara y lista para grabar: TÍTULO VIRAL, GANCHO (0-3s), ESCENAS con [VISUAL] y [AUDIO], y CIERRE EN LOOP / CTA.'
        },
        { role: 'user', content: guionCrudo }
      ],
      temperature: 0.3,
      max_tokens: 1100
    };

    try {
      const resp: any = await firstValueFrom(this.http.post(this.lmStudioUrl, body));
      const msg = resp?.choices?.[0]?.message;
      const raw = (msg?.content || msg?.reasoning_content || '').trim();
      return raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    } catch (err: any) {
      console.error('Error en formatearGuionConIA:', err?.error || err);
      throw err;
    }
  }

  guardarEnHistorial(sesion: GuionItem) {
    this.historialSesiones.update((lista) => {
      const existe = lista.some((s) => s.id === sesion.id);
      return existe ? lista.map((s) => (s.id === sesion.id ? sesion : s)) : [sesion, ...lista];
    });
  }

  async generarVideoDesdeGuion(guionItem: GuionItem): Promise<string> {
  this.actualizarGuion(guionItem.id, { estadoVideo: 'generando' });

  try {
    const resp: any = await firstValueFrom(
      this.http.post(this.n8nVideoWebhookUrl, {
        id: guionItem.id,
        tema: guionItem.tema,
        guion: guionItem.guionFormateado || guionItem.guion
      })
    );

    const urlFinal = resp?.videoUrl || resp?.url || '';
    this.actualizarGuion(guionItem.id, {
      estadoVideo: urlFinal ? 'listo' : 'error',
      videoUrl: urlFinal
    });
    return urlFinal;
  } catch (err) {
    this.actualizarGuion(guionItem.id, { estadoVideo: 'error' });
    throw err;
  }
}

  eliminarDeHistorial(id: string) {
    this.historialSesiones.update((lista) => lista.filter((s) => s.id !== id));
  }

  agregarAprobado(guion: GuionItem) {
    const aprobado: GuionItem = { ...guion, estado: 'aprobado' };
    this.guardarEnHistorial(aprobado);
    this.guionesAprobados.update((lista) => [aprobado, ...lista.filter((g) => g.id !== aprobado.id)]);
  }

  actualizarGuion(id: string, cambios: Partial<GuionItem>) {
    this.guionesAprobados.update((lista) =>
      lista.map((item) => (item.id === id ? { ...item, ...cambios } : item))
    );
  }

  eliminarGuion(id: string) {
    this.guionesAprobados.update((lista) => lista.filter((item) => item.id !== id));
  }
}