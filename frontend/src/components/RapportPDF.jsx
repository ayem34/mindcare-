/**
 * RapportPDF.jsx
 * À placer dans : frontend/src/components/RapportPDF.jsx
 *
 * Utilisation dans Dashboard.jsx :
 *   1. Remplace la fonction telechargerPDF par :
 *        import { telechargerPDF } from '../components/RapportPDF';
 *   2. Installe les dépendances (une seule fois) :
 *        npm install jspdf html2canvas
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const NIVEAU = {
  faible: { color: '#27AE7A', bg: '#E8F5F0', emoji: '🟢', label: 'Faible' },
  modere: { color: '#E67E22', bg: '#FEF5E8', emoji: '🟡', label: 'Modéré' },
  eleve:  { color: '#D04A4A', bg: '#FEF2F2', emoji: '🔴', label: 'Élevé' },
};

/** Génère le HTML du rapport (même contenu que le .html de référence) */
function buildReportHTML({ displayName, totalEvals, scoreMoyen, scoreMin, scoreMax, dernierNiveau, dernierScore, derniers, conf }) {
  const dateAujourdhui = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  // Référence anonyme dérivée du nom (reproductible)
  const ref = 'ANON-' + btoa(displayName).replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase() + '-' +
              Date.now().toString(16).slice(-4).toUpperCase();

  const lignes = derniers.map(r => {
    const c = NIVEAU[r.niveau_risque] || {};
    let dateStr = 'Date inconnue';
    if (r.date_prediction) {
      const d = new Date(r.date_prediction);
      if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString('fr-FR');
    }
    return `
      <tr>
        <td>${dateStr}</td>
        <td class="bold">${(r.score_final * 100).toFixed(1)}%</td>
        <td>
          <span class="niveau-badge ${r.niveau_risque === 'faible' ? 'niveau-faible' : r.niveau_risque === 'eleve' ? 'niveau-eleve' : 'niveau-modere'}"
                style="padding:3px 10px;font-size:12px">
            ${c.emoji} ${c.label}
          </span>
        </td>
        <td>${r.classe_nlp || '—'}</td>
        <td>${r.signal_suicidaire ? '🚨 OUI' : '—'}</td>
      </tr>`;
  }).join('');

  // Évolution sur 7 jours (calculée depuis les données disponibles)
  const niveaux = derniers.map(r => r.score_final);
  const sommeilTendance = niveaux.length > 1
    ? (niveaux[0] > niveaux[niveaux.length - 1] ? '📈' : '📉')
    : '➡️';
  const stressTendance = dernierNiveau === 'eleve' ? '📈' : dernierNiveau === 'modere' ? '➡️' : '📉';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Rapport Personnel de Bien-être — MindCare IA</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'DM Sans', sans-serif;
      background: #fff;
      color: #111;
      max-width: 720px;
      margin: 0 auto;
      padding: 56px 48px 80px;
      font-size: 15px;
      line-height: 1.6;
    }

    .report-header {
      margin-bottom: 36px;
      padding-bottom: 28px;
      border-bottom: 1px solid #ddd;
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
    }
    .brand-icon {
      width: 34px; height: 34px;
      background: #27AE7A;
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 17px;
    }
    .brand-name {
      font-family: 'DM Serif Display', serif;
      font-size: 20px; color: #0D2B4E;
    }
    .brand-name sup {
      font-family: 'DM Sans', sans-serif;
      font-size: 10px; color: #27AE7A;
      font-weight: 700; letter-spacing: 0.05em;
    }

    h1 {
      font-family: 'DM Serif Display', serif;
      font-size: 28px;
      font-weight: 400;
      color: #111;
      margin-bottom: 14px;
      letter-spacing: -0.02em;
    }
    .meta-line { font-size: 13.5px; color: #444; margin-bottom: 4px; }
    .meta-line strong { color: #111; }

    .section {
      margin-bottom: 36px;
      padding-bottom: 32px;
      border-bottom: 1px solid #e8e8e8;
    }
    .section:last-child { border-bottom: none; }

    h2 {
      font-family: 'DM Serif Display', serif;
      font-size: 19px;
      font-weight: 400;
      color: #111;
      margin-bottom: 12px;
      letter-spacing: -0.01em;
    }

    p { color: #333; margin-bottom: 10px; }

    .niveau-line {
      font-size: 15px;
      font-weight: 600;
      color: #111;
      margin: 14px 0 12px;
    }

    blockquote {
      border-left: 3px solid #ccc;
      margin: 14px 0;
      padding: 10px 18px;
      color: #555;
      font-size: 13.5px;
      line-height: 1.65;
    }

    .niveau-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 40px;
      font-size: 14px;
      font-weight: 600;
      margin: 6px 0 18px;
    }
    .niveau-modere { background: #FEF5E8; color: #E67E22; border: 1px solid rgba(230,126,34,0.25); }
    .niveau-faible { background: #E8F5F0; color: #27AE7A; border: 1px solid rgba(39,174,122,0.25); }
    .niveau-eleve  { background: #FEF2F2; color: #D04A4A; border: 1px solid rgba(208,74,74,0.25); }

    .evo-item { margin-bottom: 20px; }
    .evo-title { font-weight: 700; font-size: 15px; color: #111; margin-bottom: 5px; }
    .evo-line {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 14px;
      color: #444;
    }

    .report-footer {
      margin-top: 52px;
      padding-top: 18px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #aaa;
    }
  </style>
</head>
<body>

  <!-- En-tête -->
  <div class="report-header">
    <div class="brand-row">
      <div class="brand-icon">⚡</div>
      <div class="brand-name">MindCare <sup>IA</sup></div>
    </div>
    <h1>Rapport Personnel de Bien-être</h1>
    <p class="meta-line"><strong>Date :</strong> ${dateAujourdhui}</p>
    <p class="meta-line"><strong>Référence anonyme :</strong> ${ref}</p>
    <p class="meta-line"><strong>Utilisateur :</strong> ${displayName}</p>
  </div>

  <!-- Résumé général -->
  <div class="section">
    <h2>Résumé général</h2>
    <p>
      Au cours des 7 derniers jours, certains indicateurs suggèrent
      ${dernierNiveau === 'eleve' ? 'une période de fatigue émotionnelle élevée nécessitant une attention particulière' :
        dernierNiveau === 'modere' ? 'une période de fatigue émotionnelle modérée' :
        'un état émotionnel globalement stable'}.
      Les données recueillies montrent notamment
      ${stressTendance === '📈' ? 'une augmentation du stress et des difficultés de sommeil' :
        'des niveaux de stress et de sommeil relativement stables'}.
    </p>
    <div class="niveau-line">Niveau d'attention : ${conf.label || '—'}</div>
    <span class="niveau-badge ${dernierNiveau === 'faible' ? 'niveau-faible' : dernierNiveau === 'eleve' ? 'niveau-eleve' : 'niveau-modere'}">
      ${conf.emoji || '🟡'} Risque ${conf.label || 'Modéré'} — ${dernierScore || '—'}%
    </span>
    <blockquote>
      Ce résultat est une estimation statistique basée sur les informations saisies. Il ne constitue pas un diagnostic médical.
    </blockquote>
  </div>



  <!-- Évolution observée -->
  <div class="section">
    <h2>Évolution observée</h2>

    <div class="evo-item">
      <div class="evo-title">Sommeil</div>
      <div class="evo-line">
        <span>${sommeilTendance}</span>
        <span>${sommeilTendance === '📉' ? 'Tendance à la baisse sur les 7 derniers jours.' :
                 sommeilTendance === '📈' ? 'Amélioration observée sur les 7 derniers jours.' :
                 'Niveau stable sur les 7 derniers jours.'}</span>
      </div>
    </div>

    <div class="evo-item">
      <div class="evo-title">Stress</div>
      <div class="evo-line">
        <span>${stressTendance}</span>
        <span>${stressTendance === '📈' ? 'Progression régulière du niveau de stress.' :
                 stressTendance === '📉' ? 'Diminution du niveau de stress.' :
                 'Niveau de stress relativement stable.'}</span>
      </div>
    </div>

    <div class="evo-item">
      <div class="evo-title">Anxiété</div>
      <div class="evo-line">
        <span>➡️</span>
        <span>${dernierNiveau === 'eleve' ? 'Niveau élevé, attention recommandée.' :
                 dernierNiveau === 'modere' ? 'Niveau élevé mais relativement stable.' :
                 'Niveau faible et stable.'}</span>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="report-footer">
    <span>Projet Tutoré S2 · Master Data Science · INPHB-IDSI 2025/2026</span>
    <span>Ce service ne constitue pas un diagnostic médical professionnel.</span>
  </div>

</body>
</html>`;
}

/**
 * Fonction principale — remplace telechargerPDF dans Dashboard.jsx
 * Génère un vrai PDF (pas un .html) via html2canvas + jsPDF
 */
export async function telechargerPDF(pdfData) {
  const { displayName } = pdfData;

  // 1. Créer un iframe caché pour rendre le HTML avec les styles corrects
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:794px;height:1123px;border:none;';
  document.body.appendChild(iframe);

  const html = buildReportHTML(pdfData);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  // 2. Attendre que les polices et styles se chargent
  await new Promise(resolve => setTimeout(resolve, 1200));

  try {
    const iframeBody = iframe.contentDocument.body;

    // 3. Capturer le contenu en canvas haute résolution
    const canvas = await html2canvas(iframeBody, {
      scale: 2,                          // haute résolution
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
      logging: false,
    });

    // 4. Créer le PDF A4
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth  = 210;  // mm A4
    const pageHeight = 297;  // mm A4
    const imgWidth   = pageWidth;
    const imgHeight  = (canvas.height * pageWidth) / canvas.width;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // 5. Gérer plusieurs pages si le contenu dépasse A4
    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      let yOffset = 0;
      let remainingHeight = imgHeight;

      while (remainingHeight > 0) {
        const sliceHeight = Math.min(pageHeight, remainingHeight);
        const srcY = (yOffset / imgHeight) * canvas.height;
        const srcH = (sliceHeight / imgHeight) * canvas.height;

        // Créer un canvas pour cette page
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width  = canvas.width;
        pageCanvas.height = srcH;
        const ctx = pageCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        const pageImg = pageCanvas.toDataURL('image/jpeg', 0.95);
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(pageImg, 'JPEG', 0, 0, imgWidth, sliceHeight);

        yOffset          += sliceHeight;
        remainingHeight  -= sliceHeight;
      }
    }

    // 6. Télécharger
    const fileName = `rapport-mindcare-${displayName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    pdf.save(fileName);

  } finally {
    document.body.removeChild(iframe);
  }
}
