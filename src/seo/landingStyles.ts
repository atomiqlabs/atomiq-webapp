// Bespoke, self-contained stylesheet for the marketing landing page. Injected as a
// <style> into dist-marketing/index.html only (see build-seo.tsx) so it never touches the
// SPA bundle or the /swap SEO pages. Everything is scoped under `.mk-home` to guarantee that.
//
// Design language mirrors the company page (atomiqlabs.com): near-black ink, the flask
// "potion" gradient (orange -> magenta -> purple) as the brand accent, purple gradient for
// interactive CTAs, glass cards on hairline borders. Fonts (Scandia display, WorkSans body)
// ship with the app CSS bundle that the page also links, so they are available here.
export const LANDING_CSS = `
.mk-home{
  --mk-orange:#fc9626; --mk-magenta:#ff54cd; --mk-purple:#944afc;
  --mk-purple-deep:#7a2ff3; --mk-purple-lit:#a53ff7; --mk-ink:#180931;
  --mk-flame:linear-gradient(120deg,#fc9626 0%,#ff54cd 48%,#944afc 100%);
  --mk-text:#fff; --mk-muted:rgba(255,255,255,.7); --mk-faint:rgba(255,255,255,.5);
  --mk-glass:rgba(255,255,255,.045); --mk-glass2:rgba(255,255,255,.08);
  --mk-border:rgba(255,255,255,.1); --mk-border2:rgba(255,255,255,.2);
  --mk-maxw:1140px;
  position:relative; z-index:1; color:var(--mk-text); font-family:'WorkSans',sans-serif;
}
.mk-home *,.mk-home *::before,.mk-home *::after{box-sizing:border-box;}
.mk-wrap{max-width:var(--mk-maxw); margin:0 auto; padding:0 24px;}

/* ---------- shared type ---------- */
.mk-eyebrow{
  display:inline-flex; align-items:center; gap:.6rem; font-size:.72rem; font-weight:600;
  letter-spacing:.2em; text-transform:uppercase; color:var(--mk-magenta); margin:0 0 1.1rem;
}
.mk-eyebrow::before{content:''; width:24px; height:2px; border-radius:2px; background:var(--mk-flame);}
.mk-display{font-family:'Scandia','WorkSans',sans-serif; font-weight:500; letter-spacing:-.015em; line-height:1.05; color:#fff; margin:0;}

/* ---------- hero ---------- */
.mk-hero{position:relative; overflow:hidden; padding:clamp(2.5rem,6vw,5.5rem) 0 clamp(2.5rem,5vw,4rem);}
.mk-hero__inner{position:relative; z-index:3; max-width:840px; margin:0 auto; text-align:center;}
.mk-hero__aura{
  position:absolute; z-index:1; left:50%; top:34%; width:min(1080px,124%); height:660px;
  transform:translate(-50%,-50%); pointer-events:none; filter:blur(24px);
  background:radial-gradient(closest-side, rgba(255,84,205,.30), rgba(148,74,252,.20) 46%, rgba(252,150,38,.10) 70%, transparent 79%);
}
.mk-hero__title{font-size:clamp(2.5rem,6vw,4.4rem);}
.mk-hero__sub{max-width:600px; margin:1.6rem auto 0; font-size:clamp(1.02rem,1.3vw,1.2rem); line-height:1.6; color:var(--mk-muted);}
.mk-cta{display:flex; flex-wrap:wrap; gap:1rem; justify-content:center; align-items:center; margin-top:2.3rem;}

/* flask emblems flanking the hero (company-page beaker motif) */
.mk-hero__flask{
  position:absolute; z-index:2; bottom:-4%; width:clamp(96px,11vw,158px); opacity:.95;
  filter:drop-shadow(0 16px 46px rgba(255,84,205,.4)); pointer-events:none;
}
.mk-hero__flask.is-left{left:3%;}
.mk-hero__flask.is-right{right:3%;}
@media (max-width:900px){.mk-hero__flask{display:none;}}

/* ambient rising bubbles */
.mk-bubble{position:absolute; z-index:2; border-radius:50%; background:var(--mk-flame); opacity:.5; filter:blur(.5px); pointer-events:none;}
.mk-bubble.b1{width:10px; height:10px; left:22%; bottom:14%;}
.mk-bubble.b2{width:6px; height:6px; left:72%; bottom:26%;}
.mk-bubble.b3{width:8px; height:8px; left:64%; bottom:10%;}

/* ---------- buttons ---------- */
.mk-btn{
  display:inline-flex; align-items:center; justify-content:center; gap:.55rem; font-family:'WorkSans',sans-serif;
  font-weight:600; font-size:1.02rem; line-height:1; padding:.98rem 1.9rem; border-radius:12px;
  text-decoration:none; border:1px solid transparent; cursor:pointer;
  transition:transform .18s ease, box-shadow .25s ease, background .25s ease;
}
.mk-btn--primary{color:#fff; background:linear-gradient(92deg,var(--mk-purple-deep),var(--mk-purple-lit)); box-shadow:0 10px 26px rgba(122,47,243,.38);}
.mk-btn--primary:hover{color:#fff; transform:translateY(-2px); box-shadow:0 16px 38px rgba(165,63,247,.52);}
.mk-btn--ghost{color:#fff; background:var(--mk-glass2); border-color:var(--mk-border2);}
.mk-btn--ghost:hover{color:#fff; transform:translateY(-2px); background:rgba(255,255,255,.14);}
.mk-btn__arrow{transition:transform .2s ease;}
.mk-btn:hover .mk-btn__arrow{transform:translateX(3px);}

/* ---------- supported chains strip ---------- */
.mk-chains{position:relative; z-index:3; margin-top:clamp(2.5rem,5vw,3.75rem);}
.mk-chains__label{
  display:flex; align-items:center; gap:1rem; justify-content:center; margin:0 auto 1.6rem; max-width:560px;
  font-size:.72rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:var(--mk-faint);
}
.mk-chains__label::before,.mk-chains__label::after{content:''; height:1px; flex:1; background:linear-gradient(90deg,transparent,rgba(255,255,255,.28));}
.mk-chains__label::after{background:linear-gradient(90deg,rgba(255,255,255,.28),transparent);}
.mk-chains__row{display:flex; flex-wrap:wrap; gap:.7rem; justify-content:center;}
.mk-chain{
  display:inline-flex; align-items:center; gap:.6rem; padding:.58rem 1.05rem; border-radius:999px;
  background:var(--mk-glass); border:1px solid var(--mk-border); font-weight:500; color:#fff;
  transition:transform .16s ease, border-color .16s ease, background .16s ease;
}
.mk-chain:hover{transform:translateY(-2px); border-color:var(--mk-border2); background:var(--mk-glass2);}
.mk-chain img{width:26px; height:26px; border-radius:7px; display:block;}

/* ---------- sections ---------- */
.mk-section{position:relative; z-index:3; padding:clamp(3.25rem,6.5vw,5.5rem) 0;}
.mk-section__head{max-width:660px; margin:0 0 2.6rem;}
.mk-section--center .mk-section__head{margin-left:auto; margin-right:auto; text-align:center;}
.mk-section__title{font-size:clamp(1.85rem,3.4vw,2.7rem);}
.mk-section__lead{margin:1rem 0 0; font-size:1.05rem; line-height:1.6; color:var(--mk-muted);}

/* benefit cards */
.mk-grid{display:grid; grid-template-columns:repeat(4,1fr); gap:1.25rem;}
@media (max-width:900px){.mk-grid{grid-template-columns:repeat(2,1fr);}}
@media (max-width:560px){.mk-grid{grid-template-columns:1fr;}}
.mk-card{
  position:relative; padding:1.7rem 1.4rem 1.55rem; border-radius:18px; overflow:hidden;
  background:var(--mk-glass); border:1px solid var(--mk-border);
  transition:transform .2s ease, border-color .2s ease, background .2s ease;
}
.mk-card::before{content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--mk-flame);}
.mk-card:hover{transform:translateY(-4px); border-color:var(--mk-border2); background:var(--mk-glass2);}
.mk-card__title{font-weight:600; font-size:1.14rem; margin:.3rem 0 .65rem; color:#fff;}
.mk-card__text{margin:0; font-size:.95rem; line-height:1.55; color:var(--mk-muted);}

/* escrow reaction chain */
.mk-steps{display:grid; grid-template-columns:repeat(4,1fr); gap:1.25rem;}
@media (max-width:900px){.mk-steps{grid-template-columns:1fr;}}
.mk-step{position:relative; padding:1.6rem 1.4rem; border-radius:18px; background:var(--mk-glass); border:1px solid var(--mk-border);}
.mk-step__num{
  position:relative; display:inline-flex; align-items:center; justify-content:center; width:46px; height:46px;
  border-radius:50%; font-family:'Scandia','WorkSans',sans-serif; font-weight:500; font-size:1.15rem; color:#fff; margin-bottom:1.1rem;
}
.mk-step__num::before{content:''; position:absolute; inset:0; border-radius:50%; padding:2px; background:var(--mk-flame);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude;}
.mk-step__num::after{content:''; position:absolute; inset:6px; border-radius:50%; background:rgba(255,84,205,.14);}
.mk-step__num > span{position:relative; z-index:1;}
.mk-step__text{margin:0; font-size:.95rem; line-height:1.55; color:var(--mk-muted);}

/* popular route chips */
.mk-routes{display:grid; grid-template-columns:repeat(3,1fr); gap:.75rem;}
@media (max-width:900px){.mk-routes{grid-template-columns:repeat(2,1fr);}}
@media (max-width:560px){.mk-routes{grid-template-columns:1fr;}}
.mk-route{
  display:flex; align-items:center; gap:.7rem; padding:.9rem 1.05rem; border-radius:12px; color:#fff;
  background:var(--mk-glass); border:1px solid var(--mk-border); text-decoration:none; font-size:.95rem; font-weight:500;
  transition:transform .16s ease, border-color .16s ease, background .16s ease;
}
.mk-route:hover{transform:translateY(-2px); border-color:var(--mk-border2); background:var(--mk-glass2); color:#fff;}
.mk-route img{width:22px; height:22px; display:block;}
.mk-route__arrow{margin-left:auto; color:var(--mk-magenta); font-weight:600;}

/* FAQ (reuses .seo-faqs from the app bundle; just spacing here) */
.mk-faq{margin-top:.5rem;}

/* closing CTA band */
.mk-band{
  position:relative; z-index:3; margin-top:clamp(3rem,6vw,4.5rem); padding:clamp(2.75rem,5vw,4rem) 2rem;
  border-radius:26px; text-align:center; overflow:hidden; border:1px solid var(--mk-border2);
  background:radial-gradient(130% 150% at 50% 0%, rgba(148,74,252,.32), rgba(24,9,49,.15) 58%, transparent 100%), var(--mk-glass);
}
.mk-band__title{font-size:clamp(1.8rem,3.4vw,2.6rem); margin:0 0 1rem;}
.mk-band__sub{max-width:540px; margin:0 auto 2rem; color:var(--mk-muted); line-height:1.6;}

/* ---------- a11y + motion ---------- */
.mk-home a:focus-visible,.mk-btn:focus-visible{outline:2px solid var(--mk-magenta); outline-offset:3px; border-radius:6px;}
@media (prefers-reduced-motion:no-preference){
  .mk-hero__inner{animation:mk-rise .7s ease-out both;}
  .mk-hero__flask.is-left{animation:mk-float 6s ease-in-out infinite alternate;}
  .mk-hero__flask.is-right{animation:mk-float 6s ease-in-out -3s infinite alternate;}
  .mk-bubble{animation:mk-drift 7s ease-in infinite;}
  .mk-bubble.b2{animation-duration:9s; animation-delay:-2s;}
  .mk-bubble.b3{animation-duration:8s; animation-delay:-4s;}
}
@keyframes mk-rise{from{opacity:0; transform:translateY(18px);} to{opacity:1; transform:none;}}
@keyframes mk-float{from{transform:translateY(0);} to{transform:translateY(-14px);}}
@keyframes mk-drift{0%{transform:translateY(0); opacity:0;} 15%{opacity:.55;} 100%{transform:translateY(-120px); opacity:0;}}
`;
