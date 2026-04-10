const crypto = require('crypto');

const META_PIXEL_ID = '3046746782192073';
const META_ACCESS_TOKEN = 'EAA4kfEmICLcBRLZAXKSztZC1IZAmeTRd5fS8ZCaUhwLleatFP3cV5mghjVYYowS4EEGK2pDCjhvmIXfwmZA8pf0IZAvdq37qKxAnyAVZCNBYg2Xb3s5I4yEB9o1hkjldWB95SZATyJbDFKGnKBym3EbABRUIayZC4ouSkCjm4qU708UC2KJqbVMumuRgJFrijLAZDZD';

/**
 * Hash data for Meta CAPI compliance
 */
const hash = (str) => {
    if (!str) return null;
    return crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex');
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { eventName, userData = {}, customData = {}, eventSourceUrl } = req.body;

    if (!eventName) {
        return res.status(400).json({ error: 'Event name is required' });
    }

    // Build the User Data object
    const metaUserData = {
        client_ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        client_user_agent: req.headers['user-agent'],
        fbc: req.cookies?.fbc || null,
        fbp: req.cookies?.fbp || null
    };

    // Hash PII if provided
    if (userData.email) metaUserData.em = [hash(userData.email)];
    if (userData.phone) metaUserData.ph = [hash(userData.phone)];
    if (userData.externalId) metaUserData.external_id = [hash(userData.externalId)];

    const metaPayload = {
        data: [{
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            event_source_url: eventSourceUrl || req.headers.referer || '',
            user_data: metaUserData,
            custom_data: {
                currency: customData.currency || 'BRL',
                value: parseFloat(customData.value || 0),
                ...customData
            }
        }]
    };

    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metaPayload)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Meta CAPI Error Response:', result);
            return res.status(response.status).json(result);
        }

        return res.status(200).json({ success: true, metaResponse: result });
    } catch (error) {
        console.error('Meta CAPI Server Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}
