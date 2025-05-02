const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Ruta principal
app.get('/api/metadata', async (req, res) => {
    const youtubeUrl = req.query.url;

    if (!youtubeUrl || !youtubeUrl.startsWith('https://www.youtube.com/watch?v=')) {
        return res.status(400).json({
            error: 'Se requiere un enlace válido de YouTube',
            ejemplo: '?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        });
    }

    try {
        // Paso 1: Enviar solicitud a la API /api/get-mp3
        const response = await axios.post('https://www.y2dl.app/api/get-mp3', { q: youtubeUrl }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Referer: 'https://www.y2dl.app/en68/download-youtube-to-mp3/'
            }
        });

        if (response.data.status !== 'ok') {
            return res.status(500).json({
                error: 'No se pudieron obtener los datos del video',
                detalle: response.data.msg || 'Desconocido'
            });
        }

        const data = response.data;

        // Si hay token y vid, intentamos generar el enlace de descarga
        let downloadLink = null;
        if (data.token && data.vid) {
            const convertResponse = await axios.post('https://www.y2dl.app/api/conver-to-mp3', {
                f: '128', // Calidad por defecto
                vid: data.vid,
                token: data.token
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Referer: 'https://www.y2dl.app/en68/download-youtube-to-mp3/'
                }
            });

            if (convertResponse.data.status === 'ok' && convertResponse.data.d_url) {
                downloadLink = convertResponse.data.d_url;
            }
        }

        // Devolver respuesta en español
        res.json({
            titulo: data.title,
            duracion: _changeTimeBySecond(data.time),
            imagen: `https://i.ytimg.com/vi/${data.vid}/mqdefault.jpg`,
            disponible_descarga: !!downloadLink,
            enlace_descarga: downloadLink,
            formato_disponible: data.k.map(q => ({
                calidad: q.name,
                tamaño: q.size,
                bitrate: q.q
            })),
            mensaje: 'Datos obtenidos exitosamente'
        });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            error: 'Ocurrió un problema al procesar la solicitud',
            detalle: error.message
        });
    }
});

// Función para formatear segundos a HH:MM:SS
function _changeTimeBySecond(second) {
    let hourTime = Math.floor(second / 3600);
    second %= 3600;
    let minuteTime = Math.floor(second / 60);
    let secondTime = second % 60;

    return `${hourTime > 0 ? `${hourTime}:` : ''}${String(minuteTime).padStart(2, '0')}:${String(secondTime).padStart(2, '0')}`;
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
