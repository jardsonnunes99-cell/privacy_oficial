export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, name, email, identifier, phone, ...extraData } = req.body;

  // Gerador de CPF válido para a API
  function generateCPF() {
    const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));
    let s1 = 0;
    for (let i = 0; i < 9; i++) s1 += n[i] * (10 - i);
    let d1 = (s1 * 10) % 11;
    if (d1 === 10 || d1 === 11) d1 = 0;
    let s2 = 0;
    for (let i = 0; i < 9; i++) s2 += n[i] * (11 - i);
    s2 += d1 * 2;
    let d2 = (s2 * 10) % 11;
    if (d2 === 10 || d2 === 11) d2 = 0;
    return n.concat([d1, d2]).join('');
  }

  // Fallback para Nome e Email
  const finalName = name || "Comprador WhatsApp";
  const finalEmail = email || `whatsapp_${Date.now()}@checkout-sigilo.com`;
  const finalPhone = phone ? phone.replace(/\D/g, '') : ("11" + (900000000 + Math.floor(Math.random() * 99999999)));

  const payload = {
    identifier: identifier || `order_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    amount: parseFloat(amount),
    client: {
      name: finalName,
      email: finalEmail,
      phone: finalPhone,
      document: generateCPF()
    },
    metadata: {
      provider: "Checkout WhatsApp",
      orderId: identifier,
      originalPhone: phone,
      ...extraData
    }
  };

  try {
    const response = await fetch('https://app.sigilopay.com.br/api/v1/gateway/pix/receive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-public-key': 'lumina-stuudio_n95oexti62jbkte0',
        'x-secret-key': 'vijsnmpvnfc5uhlf71gbjmwy4e5vke70mtkduri2yu470jhh06mydpu0y6cfiy0m'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('SigiloPay Error:', data);
      return res.status(response.status).json({ 
        error: data.message || 'Erro ao processar pagamento com SigiloPay',
        details: data
      });
    }

    // Retorna o formato esperado pelo frontend
    return res.status(201).json({
      pix_code: data.pix.code,
      pix_image: data.pix.image,
      transactionId: data.transactionId,
      identifier: payload.identifier
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Erro interno ao processar o Pix' });
  }
}
