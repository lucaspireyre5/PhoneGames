(()=>{'use strict';const $=id=>document.getElementById(id);const menu=$('menuToggle'),nav=$('navMain'),header=document.querySelector('.header');const closeMenu=()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Ouvrir le menu')};menu?.addEventListener('click',()=>{let open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fermer le menu':'Ouvrir le menu')});nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});document.addEventListener('click',e=>{if(nav?.classList.contains('open')&&!e.target.closest('.header'))closeMenu()});let scrollPending=false;window.addEventListener('scroll',()=>{if(!scrollPending){scrollPending=true;requestAnimationFrame(()=>{header?.classList.toggle('scrolled',window.scrollY>24);scrollPending=false})}},{passive:true});
const status=$('openStatus');function updateOpenStatus(){if(!status)return;const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const val=t=>parts.find(p=>p.type===t)?.value||'';const weekday=val('weekday'),hour=Number(val('hour')),minute=Number(val('minute')),open=['Tue','Wed','Thu','Fri','Sat'].includes(weekday)&&(hour*60+minute>=600)&&(hour*60+minute<1080);status.textContent=(open?'Ouvert selon les horaires habituels':'Fermé selon les horaires habituels');status.className='status-dot '+(open?'open':'closed')}updateOpenStatus();document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateOpenStatus()});$('year').textContent=new Date().getFullYear();
const form = $('quoteForm'), panne = $('panne'), result = $('quoteResult');
const summary = $('quoteSummary'), error = $('formError');
const submitButton = form.querySelector('button[type="submit"]');
const submitLabel = submitButton.innerHTML;
let sending = false;

document.querySelectorAll('[data-issue]').forEach(link => {
  link.addEventListener('click', () => { panne.value = link.dataset.issue; });
});

function showFormError(message, field) {
  error.textContent = message;
  error.hidden = false;
  if (field) {
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  error.hidden = true;
  form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
  const data = new FormData(form);
  if (String(data.get('_honey') || '').trim()) return;
  const name = String(data.get('nom') || '').trim();
  const phone = String(data.get('telephone') || '').trim();
  const email = String(data.get('email') || '').trim();
  const device = String(data.get('appareil') || '').trim();
  const issue = String(data.get('panne') || '').trim();
  const details = String(data.get('details') || '').trim();
  if (!name) return showFormError('Indiquez votre nom et prénom.', $('nom'));
  if (!/^\+?[\d\s().-]{9,20}$/.test(phone) || phone.replace(/\D/g, '').length < 9) {
    return showFormError('Indiquez un numéro de téléphone valide.', $('telephone'));
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showFormError('Vérifiez votre adresse e-mail.', $('email'));
  }
  if (!device) return showFormError('Indiquez le modèle de votre appareil.', $('appareil'));
  if (!issue) return showFormError('Sélectionnez votre besoin.', panne);
  if (!/^https?:$/.test(window.location.protocol)) {
    return showFormError('Pour envoyer une demande, ouvrez ce site depuis son adresse en ligne. Vous pouvez aussi appeler la boutique.');
  }

  const recap = [
    'DEMANDE DE DEVIS — PHONE GAMES NARBONNE',
    'Nom : ' + name,
    'Téléphone : ' + phone,
    email ? 'E-mail : ' + email : null,
    'Appareil : ' + device,
    'Besoin : ' + issue,
    details ? 'Description : ' + details : null
  ].filter(Boolean).join('\n');
  const payload = {
    _subject: 'Phone Games Narbonne — Nouvelle demande de devis',
    _template: 'table',
    _url: window.location.href.split('#')[0],
    'Nom et prénom': name,
    'Téléphone': phone,
    'Appareil': device,
    'Besoin': issue,
    'Détails': details || 'Non précisés'
  };
  if (email) {
    payload.email = email;
    payload._replyto = email;
  }

  sending = true;
  submitButton.disabled = true;
  submitButton.textContent = 'Envoi en cours…';
  form.setAttribute('aria-busy', 'true');
  $('sendStatus').textContent = 'Envoi de votre demande en cours…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const endpoint = form.action.replace('https://formsubmit.co/', 'https://formsubmit.co/ajax/');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const feedback = await response.json();
    if (!response.ok || !feedback || (feedback.success !== true && feedback.success !== 'true')) {
      if (feedback && /activate|activation|actived/i.test(String(feedback.message || ''))) {
        throw new Error('activation-required');
      }
      throw new Error('Submission was not confirmed');
    }
    summary.value = recap;
    form.hidden = true;
    result.hidden = false;
    result.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest'
    });
    $('quoteResultTitle').focus({ preventScroll: true });
  } catch (sendError) {
    showFormError(sendError.message === 'activation-required'
      ? 'Le formulaire attend son activation. Vos informations sont conservées. Pour joindre la boutique, appelez le 09 82 22 02 67.'
      : 'L’envoi n’a pas pu être confirmé. Vos informations sont conservées. Réessayez ou appelez la boutique au 09 82 22 02 67.');
  } finally {
    clearTimeout(timeout);
    sending = false;
    submitButton.disabled = false;
    submitButton.innerHTML = submitLabel;
    form.removeAttribute('aria-busy');
    $('sendStatus').textContent = '';
  }
});

$('editQuote').addEventListener('click', () => {
  form.reset();
  error.hidden = true;
  result.hidden = true;
  form.hidden = false;
  summary.value = '';
  $('copyStatus').textContent = '';
  form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
  $('nom').focus();
});
$('copyQuote').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(summary.value);
    $('copyStatus').textContent = 'Récapitulatif copié.';
  } catch {
    summary.focus();
    summary.select();
    $('copyStatus').textContent = 'Sélectionnez puis copiez le texte (Ctrl+C ou appui long).';
  }
});
})();
