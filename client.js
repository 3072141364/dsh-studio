/**
 * dsh-studio client half — 「技能」侧栏入口 + 技能管理面板。
 *
 * M2：拉取 host 端只读扫描结果（GET /dsh-studio/scan），渲染卡片网格。
 * 样式沿用 DSH 的 alias 设计变量，并注入 <style data-plugin-css> 标签。
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-studio',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PANEL_ID = 'dsh-studio-skills';
    const NS = 'dsh-studio';

    /* ------------------------------------------------------------------ */
    /* 样式                                                                */
    /* ------------------------------------------------------------------ */

    const CSS = `
.ds-page{box-sizing:border-box;height:100%;color:var(--dsw-alias-label-primary);flex-direction:column;gap:18px;padding:0 clamp(20px,4vw,48px) 40px;display:flex;overflow:auto}
.ds-head{padding-top:28px;flex-direction:column;gap:4px;min-width:0;display:flex}
.ds-title{margin:0;font-size:20px;font-weight:500;line-height:28px}
.ds-sub{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px;line-height:20px}
.ds-toolbar{align-items:center;gap:10px;flex-wrap:wrap;display:flex}
.ds-modes{align-items:flex-end;gap:2px;border-bottom:.5px solid var(--dsw-alias-border-l3);flex-wrap:wrap;display:flex}
.ds-modes .ds-rowLabel{padding-bottom:8px}
.ds-mode{align-items:center;gap:2px;display:inline-flex}
.ds-modeBtn{height:36px;padding:0 12px;border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer;align-items:center;gap:6px;display:inline-flex;transition:color .12s ease,border-color .12s ease}
.ds-modeBtn:hover{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-border-l3)}
.ds-modeBtn[data-active="true"]{border-bottom-color:#22d3ee;color:var(--dsw-alias-label-primary);font-weight:600}
.ds-modeX,.ds-modeEdit{width:20px;height:20px;padding:0;border:0;border-radius:50%;background:transparent;color:inherit;opacity:.5;font-size:13px;line-height:20px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:opacity .12s ease,background .12s ease}
.ds-modeX:hover,.ds-modeEdit:hover{opacity:1;background:var(--dsw-alias-interactive-bg-hover)}
.ds-modeEdit{margin-left:1px}
.ds-modeDot{width:8px;height:8px;border-radius:50%;flex:none}
.ds-modeAdd{height:36px;padding:0 12px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--dsw-alias-label-caption);font:inherit;font-size:13px;cursor:pointer}
.ds-modeAdd:hover{color:var(--dsw-alias-label-primary)}
.ds-modeCount{font-size:10.5px;line-height:16px;min-width:16px;padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary);font-weight:400;text-align:center;display:inline-block}
.ds-modeAddForm{align-items:center;gap:8px;flex-wrap:wrap;display:flex}
.ds-modeAddForm .ds-search{flex:0 1 200px}
.ds-search{flex:1;min-width:180px;height:34px;box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);outline:none;padding:0 12px;font:inherit;font-size:13px}
.ds-search::placeholder{color:var(--dsw-alias-label-caption)}
.ds-search:focus{border-color:var(--dsw-alias-state-business-primary)}
.ds-btn{height:34px;padding:0 14px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;cursor:pointer;align-items:center;justify-content:center;gap:6px;display:inline-flex;white-space:nowrap}
.ds-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.ds-btn:disabled{opacity:.55;cursor:default}
.ds-select{height:34px;padding:0 10px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;max-width:240px;cursor:pointer}
.ds-select:disabled{opacity:.55;cursor:default}
.ds-filters{flex-direction:column;gap:8px;display:flex}
.ds-row{align-items:center;gap:6px;flex-wrap:wrap;display:flex}
.ds-rowLabel{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px;flex:none;width:34px}
.ds-chip{height:26px;padding:0 10px;border-radius:999px;border:.5px solid var(--dsw-alias-border-l4);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;align-items:center;gap:5px;display:inline-flex}
.ds-chip:hover{color:var(--dsw-alias-label-primary)}
.ds-chip[data-active="true"]{border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}
.ds-dot{width:6px;height:6px;border-radius:50%;flex:none}
.ds-statusDot{flex:none;width:8px;height:8px;border-radius:50%;margin-top:1px}
.ds-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;align-content:start}
.ds-card{box-sizing:border-box;min-width:0;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1);padding:14px;flex-direction:column;gap:8px;display:flex}
.ds-cardTop{align-items:center;gap:8px;min-width:0;display:flex}
.ds-name{flex:1;min-width:0;font-size:14px;font-weight:500;line-height:20px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
.ds-badge{flex:none;border-radius:var(--dsw-radius-sm);padding:0 7px;font-size:11px;line-height:18px;white-space:nowrap}
.ds-state{flex:none;align-items:center;gap:5px;font-size:11.5px;line-height:18px;white-space:nowrap;display:inline-flex}
.ds-desc{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:18px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.ds-meta{color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)}
.ds-cardActions{flex:none;align-items:center;justify-content:flex-end;gap:6px;margin-top:2px;display:flex}
.ds-pathRow{flex:none;align-items:center;gap:2px;margin-top:2px;display:flex}
.ds-pathBtn{width:24px;height:24px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-caption);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:color .12s ease,background .12s ease}
.ds-pathBtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.ds-viewToggle{flex:none;display:inline-flex;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);overflow:hidden;margin-left:auto}
.ds-langToggle{margin-left:0}
.ds-viewToggle button{height:34px;padding:0 12px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:background .12s ease,color .12s ease}
.ds-viewToggle button + button{border-left:.5px solid var(--dsw-alias-border-l4)}
.ds-viewToggle button[data-active="true"]{background:color-mix(in srgb,#22d3ee 14%,transparent);color:var(--dsw-alias-label-primary);font-weight:600}
.ds-tableWrap{overflow-x:auto;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2)}
.ds-table{width:100%;border-collapse:collapse;font-size:12.5px;min-width:720px}
.ds-table th{text-align:left;font-weight:500;color:var(--dsw-alias-label-secondary);font-size:11px;letter-spacing:.5px;padding:8px 12px;border-bottom:.5px solid var(--dsw-alias-border-l3);white-space:nowrap}
.ds-table td{padding:8px 12px;border-bottom:.5px solid var(--dsw-alias-border-l3);vertical-align:top}
.ds-table tbody tr:last-child td{border-bottom:0}
.ds-table tbody tr:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ds-cellName{white-space:nowrap;min-width:180px}
.ds-cellDesc{color:var(--dsw-alias-label-tertiary);max-width:460px}
.ds-cellTags{white-space:nowrap}
.ds-cellActions{white-space:nowrap;text-align:right}
.ds-tblBtn{height:24px;padding:0 10px;border-radius:var(--dsw-radius-sm);border:.5px solid var(--dsw-alias-border-l4);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer;margin-left:4px;transition:background .12s ease,color .12s ease}
.ds-tblBtn:hover{color:var(--dsw-alias-label-primary)}
.ds-tblBtn:disabled{opacity:.5;cursor:default}
.ds-tblBtnPrimary{border-color:transparent;color:#07131f;background:linear-gradient(135deg,#22d3ee,#818cf8);font-weight:600}
.ds-tblBtnPrimary:hover{color:#07131f}
.ds-tblBtnDanger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,transparent)}
.ds-tblBtnDanger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary)}
.ds-cardBtn{height:26px;padding:0 10px;border-radius:var(--dsw-radius-sm);border:.5px solid var(--dsw-alias-border-l4);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.ds-cardBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ds-cardBtn:disabled{opacity:.5;cursor:default}
.ds-cardBtnPrimary{color:var(--dsw-alias-state-business-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 40%,transparent)}
.ds-cardBtnPrimary:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 10%,transparent);color:var(--dsw-alias-state-business-primary)}
.ds-cardBtnDanger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,transparent)}
.ds-cardBtnDanger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);color:var(--dsw-alias-state-error-primary)}
.ds-empty{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;padding:28px 0}
.ds-modal{position:fixed;inset:0;z-index:2147483000;background:color-mix(in srgb,#000 45%,transparent);align-items:center;justify-content:center;padding:24px;display:flex}
@supports (backdrop-filter:blur(1px)){.ds-modal{backdrop-filter:blur(6px)}}
.ds-dialog{width:min(460px,100%);box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l3);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.4),0 2px 8px rgba(0,0,0,.2);flex-direction:column;display:flex;overflow:hidden;animation:ds-pop .18s cubic-bezier(.2,.8,.2,1)}
@keyframes ds-pop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
@keyframes dsc-popUp{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:none}}
.ds-dialogHead{align-items:center;gap:10px;padding:18px 20px 16px;display:flex}
.ds-dialogIcon{width:32px;height:32px;border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 14%,transparent);color:var(--dsw-alias-state-business-primary);align-items:center;justify-content:center;flex:none;display:flex}
.ds-dialogTitle{margin:0;font-size:16px;font-weight:600;line-height:22px;flex:1;min-width:0}
.ds-dialogClose{flex:none;width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:18px;line-height:1;cursor:pointer;align-items:center;justify-content:center;display:flex}
.ds-dialogClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.ds-dialogBody{padding:2px 20px 20px;flex-direction:column;gap:12px;display:flex}
.ds-dialogBody .ds-search{height:40px;border-radius:10px;font-size:13.5px;padding:0 14px;background:var(--dsw-alias-bg-layer-2)}
.ds-dialogBody .ds-search:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-business-primary) 16%,transparent)}
.ds-dialogFoot{align-items:center;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:.5px solid var(--dsw-alias-border-l4);display:flex}
.ds-btnPrimary{background:var(--dsw-alias-state-business-primary);border-color:transparent;color:#fff;font-weight:500;height:34px;padding:0 16px}
.ds-btnPrimary:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 88%,#000);color:#fff}
.ds-btnPrimary:active:not(:disabled){transform:translateY(.5px)}
.ds-permission{box-sizing:border-box;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,transparent);border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);padding:10px 12px;flex-direction:column;gap:6px;display:flex}
.ds-permissionTitle{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:20px}
.ds-permissionDesc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.ds-permissionCmd{box-sizing:border-box;display:block;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);padding:8px 10px;font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;line-height:18px;overflow-wrap:anywhere;user-select:all}
.ds-candidateHead{align-items:center;justify-content:space-between;display:flex}
.ds-candidateTitle{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.ds-linkBtn{border:0;background:transparent;color:var(--dsw-alias-state-business-primary);font:inherit;font-size:12.5px;cursor:pointer;padding:0}
.ds-linkBtn:hover{text-decoration:underline}
.ds-candidateList{max-height:280px;flex-direction:column;gap:2px;display:flex;overflow:auto;margin:0 -4px;padding:0 4px}
.ds-candidate{align-items:flex-start;gap:8px;padding:8px 10px;border-radius:var(--dsw-radius-sm);cursor:pointer;display:flex}
.ds-candidate:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ds-candidate input{flex:none;margin:2px 0 0}
.ds-candidateText{flex:1;min-width:0;flex-direction:column;gap:1px;display:flex}
.ds-candidateName{color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;font-weight:500}
.ds-candidateDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ds-candidateMeta{align-items:center;gap:6px;flex-wrap:wrap;display:flex;margin-top:3px}
.ds-modeTagFilter{align-items:center;gap:6px;flex-wrap:wrap;display:flex}
.ds-tags{flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;display:flex}
.ds-tag{box-sizing:border-box;border:.5px solid;border-radius:999px;padding:2px 8px;font-size:11.5px;line-height:16px;white-space:nowrap}
.ds-tagAdd{box-sizing:border-box;border:.5px dashed var(--dsw-alias-border-l4);border-radius:999px;background:transparent;color:var(--dsw-alias-label-tertiary);padding:2px 8px;font-size:11.5px;line-height:16px;cursor:pointer}
.ds-tagAdd:hover{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}
.ds-empty{box-sizing:border-box;color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:18px;padding:10px 2px}
.ds-swatches{flex-wrap:wrap;align-items:center;gap:6px;display:flex}
.ds-swatch{box-sizing:border-box;width:20px;height:20px;border:2px solid transparent;border-radius:50%;cursor:pointer;padding:0}
.ds-swatchOn{border-color:var(--dsw-alias-label-primary);box-shadow:0 0 0 2px var(--dsw-alias-bg-layer-1) inset}
.ds-inlineNew{box-sizing:border-box;flex-direction:column;gap:8px;border-top:.5px solid var(--dsw-alias-border-l4);margin-top:10px;padding-top:10px;display:flex}
.ds-inlineNewBtns{justify-content:flex-end;gap:8px;display:flex}
.ds-inlineNewAdd{align-self:flex-start;margin-top:8px}
.ds-dialogWide{max-width:520px}
.ds-manageNew{flex-direction:column;gap:8px;display:flex}
.ds-manageNew .ds-search{width:100%}
.ds-manageList{flex-direction:column;gap:2px;border-top:.5px solid var(--dsw-alias-border-l4);margin-top:14px;padding-top:8px;display:flex}
.ds-manageRow{align-items:center;gap:10px;padding:6px 4px;border-radius:var(--dsw-radius-sm);display:flex}
.ds-manageRow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ds-manageDot{flex:none;width:10px;height:10px;border-radius:50%}
.ds-manageLabel{flex:1;min-width:0;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ds-manageCheck{flex:1;min-width:0;align-items:center;gap:10px;cursor:pointer;display:flex}
.ds-manageCheck input{flex:none;margin:0}
.ds-manageId{color:var(--dsw-alias-label-tertiary);font-size:12px;font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)}
.ds-manageRowEdit{flex-wrap:wrap}
.ds-manageRowEdit .ds-search{flex:1;min-width:120px}
.ds-linkDanger{color:var(--dsw-alias-state-error-primary)}
.ds-noticeOk{box-sizing:border-box;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-success-primary) 40%,transparent);border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,transparent);color:var(--dsw-alias-label-primary);padding:10px 12px;font-size:12.5px;line-height:18px;overflow-wrap:anywhere}
.ds-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483000;display:flex;align-items:flex-start;gap:8px;max-width:min(560px,calc(100vw - 32px));box-sizing:border-box;border-radius:var(--dsw-radius-md);padding:11px 12px;font-size:13px;line-height:18px;box-shadow:0 8px 28px rgba(0,0,0,.28);overflow-wrap:anywhere}
.ds-toastOk{background:var(--dsw-alias-bg-layer-1);border:.5px solid color-mix(in srgb,var(--dsw-alias-state-success-primary) 45%,transparent);color:var(--dsw-alias-label-primary)}
.ds-toastErr{background:var(--dsw-alias-bg-layer-1);border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent);color:var(--dsw-alias-label-primary)}
.ds-toastDot{flex:none;width:8px;height:8px;border-radius:50%;margin-top:5px}
.ds-toastOk .ds-toastDot{background:var(--dsw-alias-state-success-primary)}
.ds-toastErr .ds-toastDot{background:var(--dsw-alias-state-error-primary)}
.ds-toastWarn{background:var(--dsw-alias-bg-layer-1);border:.5px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 45%,transparent);color:var(--dsw-alias-label-primary)}
.ds-toastWarn .ds-toastDot{background:var(--dsw-alias-state-business-primary)}
.ds-toastText{flex:1;min-width:0}
.ds-toastClose{flex:none;border:0;background:transparent;color:inherit;opacity:.6;font-size:16px;line-height:16px;cursor:pointer;padding:0 2px;margin:-2px -2px 0 0}
.ds-toastClose:hover{opacity:1}
.ds-roots{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.ds-roots summary{cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:20px}
.ds-roots ul{margin:6px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px}
.ds-roots li{overflow-wrap:anywhere;font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:11.5px;line-height:17px}
.ds-roots code{color:var(--dsw-alias-label-caption)}
.ds-error{box-sizing:border-box;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,transparent);border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);color:var(--dsw-alias-label-primary);padding:10px 12px;font-size:12.5px;line-height:18px;white-space:pre-wrap;overflow-wrap:anywhere}
.ds-notice{flex-direction:column;gap:8px;display:flex}
/* ——— 科技感增强 ——— */
.ds-page{--tech-cyan:#22d3ee;--tech-violet:#818cf8;background-image:radial-gradient(1100px 460px at 12% -12%,color-mix(in srgb,#22d3ee 7%,transparent),transparent 60%),radial-gradient(900px 400px at 88% -4%,color-mix(in srgb,#818cf8 8%,transparent),transparent 55%)}
.ds-title{background:linear-gradient(90deg,var(--dsw-alias-label-primary) 20%,color-mix(in srgb,#22d3ee 78%,var(--dsw-alias-label-primary)) 60%,color-mix(in srgb,#818cf8 82%,var(--dsw-alias-label-primary)));-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:.5px;filter:drop-shadow(0 0 18px color-mix(in srgb,#22d3ee 22%,transparent))}
.ds-sub{font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;letter-spacing:.2px}
.ds-card{position:relative;border:.5px solid color-mix(in srgb,#22d3ee 16%,var(--dsw-alias-border-l3));background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 82%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 10px 28px -22px color-mix(in srgb,#22d3ee 55%,transparent);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
@supports (backdrop-filter:blur(1px)){.ds-card{backdrop-filter:blur(10px)}}
.ds-card::before{content:"";position:absolute;left:0;top:-1px;right:0;height:2px;border-radius:16px 16px 0 0;background:linear-gradient(90deg,transparent,color-mix(in srgb,#22d3ee 75%,transparent),color-mix(in srgb,#818cf8 75%,transparent),transparent);opacity:0;transition:opacity .18s ease}
.ds-card:hover{transform:translateY(-2px);border-color:color-mix(in srgb,#22d3ee 42%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,#22d3ee 18%,transparent),0 14px 34px -20px color-mix(in srgb,#22d3ee 60%,transparent)}
.ds-card:hover::before{opacity:1}
.ds-name{font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-weight:600;letter-spacing:.2px}
.ds-btnPrimary{background:linear-gradient(135deg,#22d3ee,#818cf8);border-color:transparent;color:#07131f;font-weight:600;box-shadow:0 6px 18px -9px color-mix(in srgb,#22d3ee 80%,transparent)}
.ds-btnPrimary:hover:not(:disabled){background:linear-gradient(135deg,color-mix(in srgb,#22d3ee 90%,#fff),color-mix(in srgb,#818cf8 90%,#fff));color:#07131f}
.ds-btnDanger{background:var(--dsw-alias-state-error-primary);border-color:transparent;color:#fff;font-weight:500}
.ds-btnDanger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 88%,#000);color:#fff}
.ds-search:focus,.ds-select:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 3px color-mix(in srgb,#22d3ee 16%,transparent)}
.ds-chip[data-active="true"]{border-color:color-mix(in srgb,#22d3ee 45%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,#22d3ee 14%,transparent),0 0 12px -6px color-mix(in srgb,#22d3ee 60%,transparent)}
.ds-tag{box-shadow:0 0 10px -6px currentColor;align-items:center;display:inline-flex}
.ds-tagX{box-sizing:border-box;margin-left:5px;width:15px;height:15px;padding:0;border:0;border-radius:50%;background:transparent;color:inherit;opacity:.5;font-size:13px;line-height:15px;cursor:pointer;align-items:center;justify-content:center;display:inline-flex;transition:opacity .12s ease,background .12s ease}
.ds-tagX:hover{opacity:1;background:color-mix(in srgb,currentColor 22%,transparent)}
.ds-dialogIconDanger{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent);color:var(--dsw-alias-state-error-primary)}
.ds-confirmText{margin:0;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px;font-weight:500;overflow-wrap:anywhere}
.ds-confirmHint{margin:0;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:19px;overflow-wrap:anywhere}
/* ===== 安装技能弹窗（浅色科技风） ===== */
.ds-installModal{background:rgba(15,23,42,.26)}
.ds-installDialog{width:min(440px,100%);border:.5px solid rgba(15,23,42,.08);border-radius:24px;background:#fff;box-shadow:0 24px 64px -16px rgba(15,23,42,.20),0 8px 24px -12px rgba(15,23,42,.12)}
.ds-installDialog .ds-dialogHead{padding:22px 24px 14px;gap:12px}
.ds-installDialog .ds-dialogIcon{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#0066FF,#00E5FF);color:#fff;box-shadow:0 0 0 1px rgba(0,102,255,.14),0 8px 20px -6px rgba(0,102,255,.6);animation:dsInstallGlow 2.8s ease-in-out infinite}
@keyframes dsInstallGlow{0%,100%{box-shadow:0 0 0 1px rgba(0,102,255,.14),0 8px 20px -6px rgba(0,102,255,.55)}50%{box-shadow:0 0 0 1px rgba(0,102,255,.24),0 8px 26px -4px rgba(0,102,255,.8)}}
.ds-installDialog .ds-dialogTitle{font-size:17px;font-weight:700;color:#1A1D20}
.ds-installDialog .ds-dialogClose{color:#9AA3AF}
.ds-installDialog .ds-dialogClose:hover{background:#F4F7F9;color:#1A1D20}
.ds-installDialog .ds-dialogBody{padding:4px 24px 24px}
.ds-installForm{flex-direction:column;gap:8px;display:flex}
.ds-installHint{margin:0;color:#8A94A3;font-size:12px;line-height:18px}
.ds-installInput{position:relative;display:flex}
.ds-installInputIcon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#9AA3AF;pointer-events:none;display:flex}
.ds-installDialog .ds-search{height:46px;border-radius:12px;background:#F4F7F9;border:.5px solid transparent;padding:0 14px 0 40px;font-size:13.5px;color:#1A1D20}
.ds-installDialog .ds-search::placeholder{color:#B4BCC7}
.ds-installDialog .ds-search:hover{background:#EFF4F8}
.ds-installDialog .ds-search:focus{border-color:#0066FF;box-shadow:0 0 0 3px rgba(0,102,255,.14);background:#fff}
.ds-installDialog .ds-dialogFoot{padding:16px 24px;border-top:.5px solid rgba(15,23,42,.06)}
.ds-installCancel{height:40px;padding:0 18px;border:0;border-radius:12px;background:transparent;color:#6B7280;font:inherit;font-size:13.5px;cursor:pointer;transition:background .16s ease}
.ds-installCancel:hover{background:#F4F7F9;color:#1A1D20}
.ds-installDialog .ds-btnPrimary{height:40px;padding:0 22px;border-radius:12px;background:linear-gradient(135deg,#0066FF,#00E5FF);color:#fff;font-weight:600;box-shadow:0 8px 20px -8px rgba(0,102,255,.55)}
.ds-installDialog .ds-btnPrimary:hover:not(:disabled){background:linear-gradient(135deg,#0066FF,#00E5FF);filter:brightness(1.06);color:#fff}
.ds-installDialog .ds-btnPrimary:active:not(:disabled){transform:translateY(.5px)}
.ds-installDialog .ds-btnPrimary:disabled{opacity:.5;color:#fff;box-shadow:none}
/* ===== 编辑模式弹窗（浅色科技风） ===== */
.ds-modeDialog{width:min(540px,100%);border:.5px solid rgba(15,23,42,.06);border-radius:20px;background:#fff;box-shadow:0 24px 60px -18px rgba(15,23,42,.22),0 8px 24px -12px rgba(0,102,255,.10)}
.ds-modeDialog .ds-dialogHead{padding:20px 22px 14px;border-bottom:1px solid #f1f5f9}
.ds-modeDialog .ds-dialogIcon{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#0066FF,#00E5FF);color:#fff;box-shadow:0 8px 20px -6px rgba(0,102,255,.55)}
.ds-modeDialog .ds-dialogTitle{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-.01em}
.ds-modeDialog .ds-dialogClose{color:#94a3b8}
.ds-modeDialog .ds-dialogClose:hover{background:#f1f5f9;color:#334155}
.ds-modeDialog .ds-dialogBody{padding:16px 22px 18px;gap:14px}
.ds-modeSearch{position:relative;display:flex}
.ds-modeSearchIcon{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none;display:flex}
.ds-modeDialog .ds-search{flex:none;width:100%;height:44px;border-radius:12px;background:#f8fafc;border:1px solid transparent;padding:0 14px;font-size:13.5px;color:#0f172a;transition:background .16s ease,border-color .16s ease,box-shadow .16s ease}
.ds-modeSearch .ds-search{padding-left:40px}
.ds-modeDialog .ds-search::placeholder{color:#94a3b8}
.ds-modeDialog .ds-search:hover{background:#f1f5f9}
.ds-modeDialog .ds-search:focus{background:#fff;border-color:#0066FF;box-shadow:0 0 0 3px rgba(0,102,255,.12),0 4px 14px -6px rgba(0,102,255,.22)}
.ds-modeDialog .ds-chip{height:28px;padding:0 12px;border-radius:999px;border:1px solid transparent;background:#f1f5f9;color:#475569;font-size:12px;transition:background .16s ease,color .16s ease,border-color .16s ease,box-shadow .16s ease}
.ds-modeDialog .ds-chip:hover{background:#e2e8f0;color:#0f172a}
.ds-modeDialog .ds-chip[data-active="true"]{background:#eff6ff;color:#0066FF;border-color:#93c5fd;font-weight:500;box-shadow:0 0 0 1px rgba(0,102,255,.06)}
.ds-modeDialog .ds-candidateTitle{font-size:13px;color:#334155}
.ds-modeDialog .ds-candidateTitle b{color:#0066FF;font-weight:700;font-size:14px}
.ds-modeDialog .ds-linkBtn{height:26px;padding:0 10px;border-radius:8px;background:transparent;color:#0066FF;font-size:12.5px;transition:background .14s ease,color .14s ease}
.ds-modeDialog .ds-linkBtn:hover{background:#eff6ff;color:#0066FF;text-decoration:none}
.ds-modeDialog .ds-candidateList{max-height:320px;margin:0 -10px;padding:0 10px;gap:3px;scrollbar-width:thin;scrollbar-color:#dbe3ec transparent}
.ds-modeDialog .ds-candidateList::-webkit-scrollbar{width:6px}
.ds-modeDialog .ds-candidateList::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:999px}
.ds-modeDialog .ds-candidateList::-webkit-scrollbar-thumb:hover{background:#cbd5e1}
.ds-modeDialog .ds-candidate{padding:9px 10px;border-radius:10px;gap:10px;transition:background .15s ease}
.ds-modeDialog .ds-candidate:hover{background:#f8fafc}
.ds-modeDialog .ds-check{-webkit-appearance:none;appearance:none;flex:none;width:18px;height:18px;margin:1px 0 0;padding:0;border:1.5px solid #cbd5e1;border-radius:4px;background:#fff;cursor:pointer;transition:background .15s ease,border-color .15s ease,box-shadow .15s ease}
.ds-modeDialog .ds-check:hover{border-color:#93c5fd}
.ds-modeDialog .ds-check:checked{background-color:#0066FF;border-color:#0066FF;background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='white'%20stroke-width='3'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='M20%206L9%2017l-5-5'/%3E%3C/svg%3E");background-size:12px;background-position:center;background-repeat:no-repeat}
.ds-modeDialog .ds-check:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(0,102,255,.18)}
.ds-modeDialog .ds-candidateName{font-size:13.5px;font-weight:600;color:#0f172a}
.ds-modeDialog .ds-candidateDesc{font-size:12px;color:#94a3b8}
.ds-modeDialog .ds-candidateMeta{gap:5px;margin-top:4px}
.ds-modeDialog .ds-tag{border:0;padding:1px 7px;font-size:11px;line-height:16px;border-radius:6px;box-shadow:none}
.ds-modeDialog .ds-empty{color:#94a3b8}
.ds-modeDialog .ds-dialogFoot{padding:14px 22px;border-top:1px solid #f1f5f9;background:#fff}
.ds-modeDialog .ds-btn{height:38px;padding:0 18px;border-radius:11px}
.ds-modeCancel{height:38px;padding:0 18px;border:0;border-radius:11px;background:transparent;color:#6b7280;font:inherit;font-size:13.5px;cursor:pointer;transition:background .15s ease,color .15s ease}
.ds-modeCancel:hover{background:#f1f5f9;color:#334155}
.ds-modeDialog .ds-btnPrimary{height:38px;padding:0 22px;border-radius:11px;background:linear-gradient(135deg,#0066FF,#00E5FF);color:#fff;font-weight:600;box-shadow:0 8px 20px -8px rgba(0,102,255,.55)}
.ds-modeDialog .ds-btnPrimary:hover:not(:disabled){background:linear-gradient(135deg,#0066FF,#00E5FF);filter:brightness(1.06);color:#fff}
.ds-modeDialog .ds-btnPrimary:active:not(:disabled){transform:translateY(.5px)}
.ds-modeDialog .ds-btnPrimary:disabled{opacity:.5;color:#fff;box-shadow:none}
.ds-modeCreateDialog{width:min(400px,100%)}
.ds-modeCreateDialog .ds-search{border-color:#e2e8f0}
.ds-modeDialog .ds-installHint{margin:0;color:#94a3b8;font-size:12px;line-height:18px;align-items:center;gap:6px;display:flex}
@media (prefers-reduced-motion:reduce){.ds-card,.ds-card::before,.ds-tagX,.ds-btnPrimary,.ds-installDialog .ds-dialogIcon{transition:none;animation:none}.ds-card:hover{transform:none}}
/* ===== 聊天输入框 · 技能组（模式）多选 ===== */
.dsc-root{position:relative;display:inline-flex}
.dsc-trigger{height:28px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;align-items:center;gap:6px;display:inline-flex;white-space:nowrap;transition:color .12s ease,background .12s ease}
.dsc-trigger:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dsc-trigger[aria-expanded="true"]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dsc-dot{width:8px;height:8px;border-radius:50%;flex:none;box-shadow:0 0 8px currentColor}
.dsc-triggerText{max-width:128px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsc-caret{color:var(--dsw-alias-label-caption);display:inline-flex}
.dsc-menu{position:absolute;bottom:calc(100% + 6px);left:0;z-index:2147483000;min-width:220px;max-height:340px;overflow:auto;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l3);border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.28),0 2px 8px rgba(0,0,0,.18);flex-direction:column;gap:2px;padding:6px;display:flex;animation:dsc-popUp .14s cubic-bezier(.2,.8,.2,1)}
.dsc-item{align-items:center;gap:8px;padding:7px 8px;border-radius:8px;cursor:pointer;display:flex;transition:background .12s ease}
.dsc-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsc-check{-webkit-appearance:none;appearance:none;flex:none;width:16px;height:16px;margin:0;padding:0;border:1.5px solid var(--dsw-alias-border-l3);border-radius:4px;background:transparent;cursor:pointer;transition:background .13s ease,border-color .13s ease}
.dsc-check:checked{background:#22d3ee;border-color:#22d3ee;background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='white'%20stroke-width='3'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='M20%206L9%2017l-5-5'/%3E%3C/svg%3E");background-size:11px;background-position:center;background-repeat:no-repeat}
.dsc-itemDot{flex:none;width:7px;height:7px;border-radius:50%}
.dsc-itemLabel{flex:1;min-width:0;color:var(--dsw-alias-label-primary);font-size:12.5px;line-height:18px;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsc-itemCount{flex:none;font-size:11px;line-height:16px;min-width:16px;padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary);text-align:center}
`;

    function ensureStyle() {
      if (typeof document === 'undefined') return;
      const tagId = '@local/dsh-studio/panel.css';
      // JSON.stringify 自带引号，选择器里不能再包一层双引号，否则选择器非法会抛 SyntaxError。
      const selector = 'style[data-plugin-css=' + JSON.stringify(tagId) + ']';
      try {
        if (document.querySelector(selector) !== null) return;
        const tag = document.createElement('style');
        tag.dataset.plugin = '@local/dsh-studio';
        tag.dataset.pluginCss = tagId;
        tag.textContent = CSS;
        document.head.appendChild(tag);
      } catch (error) {
        // 样式是纯装饰，注入失败不该拖垮插件激活。
        console.error('[dsh-studio] style injection failed', error);
      }
    }

    /* ------------------------------------------------------------------ */
    /* 常量                                                                */
    /* ------------------------------------------------------------------ */

    const AGENT_META = {
      dsh: { label: 'DSH', accent: '#6366f1', bg: 'rgba(99,102,241,0.14)' },
      agents: { label: 'agents', accent: '#7c3aed', bg: 'rgba(124,58,237,0.13)' },
      claude: { label: 'claude', accent: '#d97706', bg: 'rgba(217,119,6,0.14)' },
      omp: { label: 'omp', accent: '#0891b2', bg: 'rgba(8,145,178,0.14)' },
      pi: { label: 'pi', accent: '#c026d3', bg: 'rgba(192,38,211,0.13)' },
      opencode: { label: 'opencode', accent: '#16a34a', bg: 'rgba(22,163,74,0.14)' },
      codex: { label: 'codex', accent: '#64748b', bg: 'rgba(100,116,139,0.16)' },
      local: { label: 'local', accent: '#475569', bg: 'rgba(71,85,105,0.14)' },
    };

    const STATUS_META = {
      enabled: { label: '已激活', color: 'var(--dsw-alias-state-success-primary)' },
      disabled: { label: '未激活', color: 'var(--dsw-alias-label-tertiary)' },
      orphan: { label: '断链', color: 'var(--dsw-alias-state-error-primary)' },
    };

    const TAG_COLORS = ['#14b8a6', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#ef4444', '#6366f1', '#f97316', '#64748b'];

    /** all（全部）模式的固定颜色。 */
    const ALL_MODE_COLOR = '#22d3ee';

    const agentMeta = (agent) => AGENT_META[agent] || AGENT_META.local;

    /** 卡片的「来源」= 物理所在（claude / local / agents / …），而不是「被谁加载」。 */
    const originOf = (skill) => skill.originAgent || skill.sourceAgent || 'dsh';

    /** 卸载/清除断链 按钮组（卡片与表格共用）。无启用/禁用概念。 */
    function statusButtons(skill, opts) {
      const busy = opts.busy;
      const danger = opts.danger || 'ds-cardBtn ds-cardBtnDanger';
      const out = [];
      if (skill.status === 'enabled') {
        out.push(h('button', { key: 'uninstall', className: danger, type: 'button', disabled: busy, onClick: () => opts.onUninstall(skill) }, '卸载'));
      } else if (skill.status === 'orphan') {
        out.push(h('button', { key: 'uninstall', className: danger, type: 'button', disabled: busy, onClick: () => opts.onUninstall(skill) }, '清除断链'));
      }
      return out;
    }

    /* ------------------------------------------------------------------ */
    /* 图标                                                                */
    /* ------------------------------------------------------------------ */

    function SkillsGlyph(props) {
      const size = props && props.size ? props.size : 18;
      return h(
        'svg',
        {
          viewBox: '0 0 64 64',
          width: size,
          height: size,
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('rect', { x: 8, y: 8, width: 20, height: 20, rx: 5, fill: 'currentColor' }),
        h('rect', { x: 36, y: 8, width: 20, height: 20, rx: 5, fill: 'currentColor', opacity: 0.72 }),
        h('rect', { x: 8, y: 36, width: 20, height: 20, rx: 5, fill: 'currentColor', opacity: 0.72 }),
        h('rect', { x: 36, y: 36, width: 20, height: 20, rx: 5, fill: 'currentColor', opacity: 0.45 }),
      );
    }

    /* ------------------------------------------------------------------ */
    /* 数据                                                                */
    /* ------------------------------------------------------------------ */

    async function fetchScan() {
      const response = await fetch('/' + NS + '/scan', {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error('HTTP ' + response.status + (body ? ' · ' + body.slice(0, 200) : ''));
      }
      return response.json();
    }

    async function fetchGroups() {
      const response = await fetch('/' + NS + '/groups', {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }

    async function fetchLlmRoutes() {
      const response = await fetch('/' + NS + '/llm-routes', {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }

    async function fetchModes() {
      const response = await fetch('/' + NS + '/modes', {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }

    async function fetchTranslations() {
      const response = await fetch('/' + NS + '/translate', {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }

    async function post(path, body) {
      const response = await fetch('/' + NS + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await response.text().catch(() => '');
      let payload = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        payload = { error: text };
      }
      if (!response.ok || payload.ok === false) {
        const message = payload.error || 'HTTP ' + response.status;
        if (response.status === 404 || response.status === 405) {
          throw new Error(message + '（host 端路由未就绪，请完全退出并重启 DeepSeek Harness）');
        }
        const error = new Error(message);
        if (payload.needPermission) {
          error.needPermission = true;
          error.hint = payload.hint || '';
        }
        throw error;
      }
      return payload;
    }

    /* ------------------------------------------------------------------ */
    /* 卡片                                                                */
    /* ------------------------------------------------------------------ */

    function SourceBadge(props) {
      const meta = agentMeta(props.agent);
      return h(
        'span',
        {
          className: 'ds-badge',
          style: {
            background: meta.bg,
            color: 'color-mix(in srgb, ' + meta.accent + ' 65%, var(--dsw-alias-label-primary))',
          },
          title: '来源：' + (props.sources || [props.agent]).join(' / '),
        },
        meta.label,
      );
    }

    function StatusTag(props) {
      const meta = STATUS_META[props.status] || STATUS_META.disabled;
      const hollow = props.status === 'orphan';
      return h('span', {
        className: 'ds-statusDot',
        style: hollow
          ? { background: 'transparent', boxShadow: 'inset 0 0 0 1.5px ' + meta.color }
          : { background: meta.color, boxShadow: '0 0 8px ' + meta.color },
        title: meta.label,
        'aria-label': meta.label,
        role: 'img',
      });
    }

    function ColorSwatches(props) {
      return h(
        'div',
        { className: 'ds-swatches', role: 'group', 'aria-label': '颜色' },
        TAG_COLORS.map((color) =>
          h(
            'button',
            {
              key: color,
              type: 'button',
              className: 'ds-swatch' + (props.value === color ? ' ds-swatchOn' : ''),
              style: { background: color },
              'aria-label': color,
              onClick: () => props.onChange(color),
            },
          ),
        ),
      );
    }

    function SkillCard(props) {
      const skill = props.skill;
      const origin = originOf(skill);
      const busy = props.busy === skill.name;
      const tags = props.tags || [];
      const buttons = statusButtons(skill, { busy, onUninstall: props.onUninstall });
      const zh = (props.translations || {})[skill.name];
      const showZh = props.descLang === 'zh' && zh;
      const descText = showZh ? zh : skill.description;
      const descTitle = showZh ? skill.description : zh;

      return h(
        'div',
        { className: 'ds-card' },
        h(
          'div',
          { className: 'ds-cardTop' },
          h(StatusTag, { status: skill.status }),
          h('span', { className: 'ds-name', title: skill.name }, skill.name),
          h(SourceBadge, { agent: origin, sources: skill.sources }),
        ),
        descText
          ? h('p', { className: 'ds-desc', title: descTitle || undefined }, descText)
          : null,
        skill.path
          ? h(
              'div',
              { className: 'ds-pathRow' },
              h(
                'button',
                {
                  className: 'ds-pathBtn',
                  type: 'button',
                  title: '打开文件夹：' + skill.path,
                  'aria-label': '打开文件夹 ' + skill.name,
                  onClick: () => props.onOpenFolder(skill),
                },
                h(
                  'svg',
                  { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
                  h('path', { d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z' }),
                ),
              ),
            )
          : null,
        h(
          'div',
          { className: 'ds-tags' },
          tags.map((tag) =>
            h(
              'span',
              {
                key: tag.id,
                className: 'ds-tag',
                style: { color: tag.color, borderColor: 'color-mix(in srgb, ' + tag.color + ' 45%, transparent)', background: 'color-mix(in srgb, ' + tag.color + ' 12%, transparent)' },
                title: '分组：' + tag.label,
              },
              tag.label,
              h(
                'button',
                {
                  className: 'ds-tagX',
                  type: 'button',
                  'aria-label': '移除标签 ' + tag.label,
                  title: '移除此标签',
                  onClick: () => props.onRemoveTag(skill, tag.id),
                },
                '×',
              ),
            ),
          ),
          h(
            'button',
            { className: 'ds-tagAdd', type: 'button', onClick: () => props.onTag(skill), title: '设置分组' },
            tags.length > 0 ? '＋标签' : '＋ 加标签',
          ),
        ),
        buttons.length > 0 ? h('div', { className: 'ds-cardActions' }, buttons) : null,
      );
    }

    /* ------------------------------------------------------------------ */
    /* 面板                                                                */
    /* ------------------------------------------------------------------ */

    function SkillsPanel() {
      const [data, setData] = React.useState(null);
      const [error, setError] = React.useState(null);
      const [loading, setLoading] = React.useState(true);
      const [query, setQuery] = React.useState('');
      const [agent, setAgent] = React.useState('all');
      const [groupFilter, setGroupFilter] = React.useState('all');
      const [groups, setGroups] = React.useState([]);
      const [assignments, setAssignments] = React.useState({});
      const [busy, setBusy] = React.useState(null);
      const [notice, setNotice] = React.useState(null);
      const [installOpen, setInstallOpen] = React.useState(false);
      const [installValue, setInstallValue] = React.useState('');
      const [installBusy, setInstallBusy] = React.useState(false);
      const [permissionHint, setPermissionHint] = React.useState('');
      const [candidates, setCandidates] = React.useState(null);
      const [selected, setSelected] = React.useState([]);
      const [tagSkill, setTagSkill] = React.useState(null);
      const [tagSelected, setTagSelected] = React.useState([]);
      const [editId, setEditId] = React.useState(null);
      const [editLabel, setEditLabel] = React.useState('');
      const [editColor, setEditColor] = React.useState(TAG_COLORS[0]);
      const [inlineNew, setInlineNew] = React.useState(false);
      const [inlineId, setInlineId] = React.useState('');
      const [inlineColor, setInlineColor] = React.useState(TAG_COLORS[0]);
      const [autoTagBusy, setAutoTagBusy] = React.useState(false);
      const [autoTagPending, setAutoTagPending] = React.useState(false);
      const [llmRoutes, setLlmRoutes] = React.useState([]);
      const [llmRouteIndex, setLlmRouteIndex] = React.useState(-1);
      const [confirmUninstall, setConfirmUninstall] = React.useState(null);
      const [modes, setModes] = React.useState([]);
      const [activeMode, setActiveMode] = React.useState('all');
      const [modeBusy, setModeBusy] = React.useState(null);
      const [modeEditor, setModeEditor] = React.useState(null);
      const [modePickerQuery, setModePickerQuery] = React.useState('');
      const [modePickerTag, setModePickerTag] = React.useState('all');
      const [translations, setTranslations] = React.useState({});
      const [translateBusy, setTranslateBusy] = React.useState(false);
      const [translatePending, setTranslatePending] = React.useState(false);
      const [view, setView] = React.useState('card');
      const [descLang, setDescLang] = React.useState('zh');

      const refreshGroups = React.useCallback(() => {
        return fetchGroups()
          .then((groupPayload) => {
            setGroups(groupPayload.groups || []);
            setAssignments(groupPayload.assignments || {});
          })
          .catch(() => {});
      }, []);

      const runAutotag = React.useCallback(() => {
        if (autoTagBusy) return Promise.resolve();
        setAutoTagBusy(true);
        const selected = llmRouteIndex >= 0 ? llmRoutes[llmRouteIndex] : null;
        const body = selected ? { provider: selected.provider, model: selected.model } : {};
        return post('/autotag', body)
          .then((payload) => {
            if (payload.skipped) {
              setNotice({ kind: 'warn', text: '自动打标跳过：' + (payload.warning || '无可用模型') });
              return;
            }
            const tagged = payload.tagged || 0;
            const news = payload.newGroups || [];
            setNotice({
              kind: 'ok',
              text:
                tagged > 0
                  ? '已为 ' + tagged + ' 个技能自动打标' + (news.length ? '，新建标签 ' + news.join('、') : '')
                  : '所有技能都已有标签',
            });
            return refreshGroups();
          })
          .catch((cause) => setNotice({ kind: 'err', text: '自动打标失败：' + String((cause && cause.message) || cause) }))
          .finally(() => setAutoTagBusy(false));
      }, [autoTagBusy, refreshGroups, llmRoutes, llmRouteIndex]);

      const runTranslate = React.useCallback(() => {
        if (translateBusy) return Promise.resolve();
        setTranslateBusy(true);
        const selected = llmRouteIndex >= 0 ? llmRoutes[llmRouteIndex] : null;
        const body = selected ? { provider: selected.provider, model: selected.model } : {};
        return post('/translate-run', body)
          .then((payload) => {
            if (payload.skipped) {
              setNotice({ kind: 'warn', text: '介绍翻译跳过：' + (payload.warning || '无可用模型') });
              return;
            }
            const translated = payload.translated || 0;
            setNotice({ kind: 'ok', text: translated > 0 ? '已翻译 ' + translated + ' 个技能介绍为中文' : '所有介绍都已是中文' });
            return fetchTranslations()
              .then((map) => setTranslations(map && typeof map === 'object' ? map : {}))
              .catch(() => {});
          })
          .catch((cause) => setNotice({ kind: 'err', text: '介绍翻译失败：' + String((cause && cause.message) || cause) }))
          .finally(() => setTranslateBusy(false));
      }, [translateBusy, llmRoutes, llmRouteIndex]);

      const load = React.useCallback(() => {
        setLoading(true);
        setError(null);
        fetchScan()
          .then(async (payload) => {
            setData(payload);
            const [groupPayload, routesPayload, modesPayload, translationsPayload] = await Promise.all([
              fetchGroups().catch(() => ({ groups: [], assignments: {} })),
              fetchLlmRoutes().catch(() => ({ routes: [], defaultRoute: null })),
              fetchModes().catch(() => ({ active: 'default', modes: [] })),
              fetchTranslations().catch(() => ({})),
            ]);
            setGroups(groupPayload.groups || []);
            setAssignments(groupPayload.assignments || {});
            setModes(modesPayload.modes || []);
            setActiveMode(modesPayload.active || 'all');
            setTranslations(translationsPayload && typeof translationsPayload === 'object' ? translationsPayload : {});
            const routes = routesPayload.routes || [];
            setLlmRoutes(routes);
            // 后台自动打标/翻译统一用 host 给的默认模型（DeepSeek flash 优先）。
            let routeIndex = -1;
            const def = routesPayload.defaultRoute;
            const defIndex = def ? routes.findIndex((r) => r.provider === def.provider && r.model === def.model) : -1;
            routeIndex = defIndex >= 0 ? defIndex : routes.length > 0 ? 0 : -1;
            setLlmRouteIndex(routeIndex);
            setLoading(false);
            const untagged = payload.skills.filter((skill) => !((groupPayload.assignments || {})[skill.name] || []).length).length;
            if (untagged > 0) setAutoTagPending(true);
            const untranslated = payload.skills.filter((skill) => {
              const desc = String(skill.description || '').trim();
              return desc !== '' && !/[\u4e00-\u9fff]/.test(desc) && !(translationsPayload || {})[skill.name];
            }).length;
            if (untranslated > 0) setTranslatePending(true);
          })
          .catch((cause) => {
            setError(String((cause && cause.message) || cause));
            setLoading(false);
          });
      }, []);

      React.useEffect(() => {
        ensureStyle();
        load();
      }, [load]);

      // 扫描/安装后发现未打标技能 → 自动触发一次大模型打标。
      React.useEffect(() => {
        if (!autoTagPending || autoTagBusy || loading) return;
        setAutoTagPending(false);
        runAutotag();
      }, [autoTagPending, autoTagBusy, loading, runAutotag]);

      // 扫描/安装后发现英文介绍未翻译 → 自动触发一次大模型翻译。
      React.useEffect(() => {
        if (!translatePending || translateBusy || loading) return;
        setTranslatePending(false);
        runTranslate();
      }, [translatePending, translateBusy, loading, runTranslate]);

      const modeLabelOf = React.useCallback((id) => {
        if (id === 'all') return 'all';
        const mode = modes.find((item) => item.id === id);
        return mode ? mode.label : id;
      }, [modes]);

      const applyModeAction = React.useCallback((id) => {
        if (modeBusy) return;
        setModeBusy(id);
        setNotice(null);
        post('/modes/apply', { id })
          .then(() => {
            load();
          })
          .catch((cause) => setNotice({ kind: 'err', text: String((cause && cause.message) || cause) }))
          .finally(() => setModeBusy(null));
      }, [modeBusy, load]);

      const openCreateMode = React.useCallback(() => {
        setModeEditor({ id: '', label: '', skills: [], isNew: true });
        setModePickerQuery('');
      }, []);

      const openEditMode = React.useCallback((mode) => {
        setModeEditor({ id: mode.id, label: mode.label, skills: (mode.skills || []).slice(), isNew: false });
        setModePickerQuery('');
        setModePickerTag('all');
      }, []);

      const toggleModeSkill = React.useCallback((name) => {
        setModeEditor((editor) =>
          editor
            ? {
                ...editor,
                skills: editor.skills.includes(name)
                  ? editor.skills.filter((item) => item !== name)
                  : editor.skills.concat(name),
              }
            : editor,
        );
      }, []);

      const toggleAllModeSkills = React.useCallback((names) => {
        setModeEditor((editor) => {
          if (!editor) return editor;
          const allIn = names.length > 0 && names.every((name) => editor.skills.includes(name));
          return { ...editor, skills: allIn ? editor.skills.filter((name) => !names.includes(name)) : [...new Set(editor.skills.concat(names))] };
        });
      }, []);

      const saveModeAction = React.useCallback(() => {
        if (!modeEditor) return;
        const label = modeEditor.label.trim();
        const isNew = modeEditor.isNew;
        if (isNew && label === '') return;
        const body = isNew
          ? { label, skills: modeEditor.skills }
          : { id: modeEditor.id, label: label || modeEditor.id, skills: modeEditor.skills };
        const path = isNew ? '/modes/add' : '/modes/save';
        const displayName = label || modeEditor.id;
        post(path, body)
          .then(() => {
            setNotice({ kind: 'ok', text: (isNew ? '已新增模式 ' : '已更新模式 ') + displayName });
            setModeEditor(null);
            load();
          })
          .catch((cause) => setNotice({ kind: 'err', text: String((cause && cause.message) || cause) }));
      }, [modeEditor, load]);

      const deleteModeAction = React.useCallback((id) => {
        post('/modes/delete', { id })
          .then(() => {
            setNotice({ kind: 'ok', text: '已删除模式 ' + modeLabelOf(id) });
            load();
          })
          .catch((cause) => setNotice({ kind: 'err', text: String((cause && cause.message) || cause) }));
      }, [load, modeLabelOf]);

      const doUninstall = React.useCallback((skill) => {
        setBusy(skill.name);
        setNotice(null);
        post('/uninstall', { name: skill.name })
          .then(() => {
            setNotice({ kind: 'ok', text: '已卸载 ' + skill.name + '（源目录保留）' });
            setConfirmUninstall(null);
            load();
          })
          .catch((cause) => setNotice({ kind: 'err', text: String((cause && cause.message) || cause) }))
          .finally(() => setBusy(null));
      }, [load]);

      const onUninstall = React.useCallback((skill) => {
        setConfirmUninstall(skill);
      }, []);

      const removeTag = React.useCallback((skill, tagId) => {
        const next = (assignments[skill.name] || []).filter((id) => id !== tagId);
        setNotice(null);
        post('/groups/set', { name: skill.name, groups: next })
          .then(() => {
            setNotice({ kind: 'ok', text: '已从 ' + skill.name + ' 移除该标签' });
            refreshGroups();
          })
          .catch((cause) => setNotice({ kind: 'err', text: String((cause && cause.message) || cause) }));
      }, [assignments, refreshGroups]);

      const openFolderAction = React.useCallback((skill) => {
        const path = skill.path || skill.linkPath;
        if (!path) return;
        setNotice(null);
        post('/open-folder', { path })
          .then(() => setNotice({ kind: 'ok', text: '已在文件管理器中打开' }))
          .catch((cause) => setNotice({ kind: 'err', text: String((cause && cause.message) || cause) }));
      }, []);

      const onInstall = React.useCallback(() => {
        const value = installValue.trim();
        if (value === '') return;
        setInstallBusy(true);
        setNotice(null);
        setPermissionHint('');
        setCandidates(null);
        post('/install', { source: value })
          .then((payload) => {
            if (payload.needSelect && Array.isArray(payload.candidates)) {
              setCandidates(payload.candidates);
              setSelected(payload.candidates.map((candidate) => candidate.name));
            } else {
              setNotice({ kind: 'ok', text: '已安装 ' + (payload.skills || []).join('、') + '（下一回合生效）' });
              setInstallValue('');
              setInstallOpen(false);
              load();
            }
          })
          .catch((cause) => {
            if (cause && cause.needPermission) {
              setPermissionHint(cause.hint || '');
              setNotice({ kind: 'err', text: cause.message });
            } else {
              setNotice({ kind: 'err', text: String((cause && cause.message) || cause) });
            }
          })
          .finally(() => setInstallBusy(false));
      }, [installValue, load]);

      const onInstallSelected = React.useCallback(() => {
        const value = installValue.trim();
        if (selected.length === 0) return;
        setInstallBusy(true);
        setNotice(null);
        setPermissionHint('');
        post('/install', { source: value, names: selected })
          .then((payload) => {
            setNotice({ kind: 'ok', text: '已安装 ' + (payload.skills || []).join('、') + '（下一回合生效）' });
            setInstallValue('');
            setCandidates(null);
            setInstallOpen(false);
            load();
          })
          .catch((cause) => {
            if (cause && cause.needPermission) {
              setPermissionHint(cause.hint || '');
              setNotice({ kind: 'err', text: cause.message });
            } else {
              setNotice({ kind: 'err', text: String((cause && cause.message) || cause) });
            }
          })
          .finally(() => setInstallBusy(false));
      }, [installValue, selected, load]);

      const toggleCandidate = React.useCallback((name) => {
        setSelected((list) => (list.includes(name) ? list.filter((item) => item !== name) : list.concat(name)));
      }, []);

      const toggleSelectAll = React.useCallback(() => {
        setSelected((list) => (list.length === candidates.length ? [] : candidates.map((candidate) => candidate.name)));
      }, [candidates]);

      const openTag = React.useCallback((skill) => {
        setTagSkill(skill.name);
        setTagSelected(assignments[skill.name] || []);
      }, [assignments]);

      const toggleTag = React.useCallback((id) => {
        setTagSelected((list) => (list.includes(id) ? list.filter((item) => item !== id) : list.concat(id)));
      }, []);

      const saveTags = React.useCallback(() => {
        if (!tagSkill) return;
        setNotice(null);
        post('/groups/set', { name: tagSkill, groups: tagSelected })
          .then(() => {
            setNotice({ kind: 'ok', text: '已更新 ' + tagSkill + ' 的分组' });
            setTagSkill(null);
            refreshGroups();
          })
          .catch((cause) => setNotice({ kind: 'err', text: String((cause && cause.message) || cause) }));
      }, [tagSkill, tagSelected, refreshGroups]);

      const renameGroupAction = React.useCallback((id, label, color) => {
        setNotice(null);
        post('/groups/rename', { id, label, color })
          .then(() => {
            setNotice({ kind: 'ok', text: '已更新分组 ' + id });
            setEditId(null);
            refreshGroups();
          })
          .catch((cause) => setNotice({ kind: 'err', text: String((cause && cause.message) || cause) }));
      }, [refreshGroups]);

      const removeGroupAction = React.useCallback((id) => {
        setNotice(null);
        post('/groups/delete', { id })
          .then(() => {
            setNotice({ kind: 'ok', text: '已删除分组 ' + id });
            if (groupFilter === id) setGroupFilter('all');
            refreshGroups();
          })
          .catch((cause) => setNotice({ kind: 'err', text: String((cause && cause.message) || cause) }));
      }, [refreshGroups, groupFilter]);

      const createInlineGroup = React.useCallback(() => {
        const id = inlineId.trim();
        if (id === '') return;
        setNotice(null);
        post('/groups/add', { id, color: inlineColor })
          .then(() => {
            setTagSelected((list) => (list.includes(id) ? list : list.concat(id)));
            setInlineNew(false);
            setInlineId('');
            setInlineColor(TAG_COLORS[0]);
            refreshGroups();
          })
          .catch((cause) => setNotice({ kind: 'err', text: String((cause && cause.message) || cause) }));
      }, [inlineId, inlineColor, refreshGroups]);

      // 安装弹窗：Esc 关闭。
      React.useEffect(() => {
        if (!installOpen) return undefined;
        const onKey = (event) => {
          if (event.key === 'Escape') setInstallOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [installOpen]);

      // 分组弹窗：Esc 关闭。
      React.useEffect(() => {
        if (!tagSkill) return undefined;
        const onKey = (event) => {
          if (event.key === 'Escape') setTagSkill(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [tagSkill]);

      // 卸载确认弹窗：Esc 关闭。
      React.useEffect(() => {
        if (!confirmUninstall) return undefined;
        const onKey = (event) => {
          if (event.key === 'Escape') setConfirmUninstall(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [confirmUninstall]);

      // 模式编辑弹窗：Esc 关闭。
      React.useEffect(() => {
        if (!modeEditor) return undefined;
        const onKey = (event) => {
          if (event.key === 'Escape') setModeEditor(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [modeEditor]);

      // 成功提示自动消失；错误提示常驻，直到手动关闭。
      React.useEffect(() => {
        if (!notice || notice.kind !== 'ok') return undefined;
        const timer = setTimeout(() => setNotice(null), 5000);
        return () => clearTimeout(timer);
      }, [notice]);

      const skills = (data && data.skills) || [];

      const agents = React.useMemo(() => {
        const seen = new Map();
        for (const skill of skills) {
          const origin = originOf(skill);
          seen.set(origin, (seen.get(origin) || 0) + 1);
        }
        return [...seen.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      }, [skills]);

      const statusCounts = React.useMemo(() => {
        const counts = { all: skills.length, enabled: 0, disabled: 0, orphan: 0 };
        for (const skill of skills) counts[skill.status] = (counts[skill.status] || 0) + 1;
        return counts;
      }, [skills]);

      const existingNames = React.useMemo(
        () => new Set(skills.filter((skill) => skill.status !== 'orphan').map((skill) => skill.name)),
        [skills],
      );

      const activeModeSkills = React.useMemo(() => {
        if (activeMode === 'all') return null;
        const mode = modes.find((item) => item.id === activeMode);
        return new Set((mode && mode.skills) || []);
      }, [activeMode, modes]);

      const modeCountOf = React.useMemo(() => {
        const map = { all: existingNames.size };
        for (const mode of modes) {
          map[mode.id] = (mode.skills || []).filter((name) => existingNames.has(name)).length;
        }
        return map;
      }, [modes, existingNames]);

      const visible = React.useMemo(() => {
        const needle = query.trim().toLowerCase();
        return skills.filter((skill) => {
          if (activeModeSkills && !activeModeSkills.has(skill.name)) return false;
          if (agent !== 'all' && originOf(skill) !== agent) return false;
          if (groupFilter !== 'all' && !(assignments[skill.name] || []).includes(groupFilter)) return false;
          if (needle === '') return true;
          return (
            skill.name.toLowerCase().includes(needle) ||
            (skill.description || '').toLowerCase().includes(needle)
          );
        });
      }, [skills, query, agent, groupFilter, assignments, activeModeSkills]);

      const pickableSkills = React.useMemo(() => {
        const needle = modePickerQuery.trim().toLowerCase();
        return skills.filter((skill) => {
          if (skill.status === 'orphan') return false;
          if (modePickerTag !== 'all' && !(assignments[skill.name] || []).includes(modePickerTag)) return false;
          if (needle === '') return true;
          return (
            skill.name.toLowerCase().includes(needle) ||
            (skill.description || '').toLowerCase().includes(needle)
          );
        });
      }, [skills, modePickerQuery, modePickerTag, assignments]);

      const groupCounts = React.useMemo(() => {
        const counts = { all: skills.length };
        for (const skill of skills) {
          for (const id of assignments[skill.name] || []) counts[id] = (counts[id] || 0) + 1;
        }
        return counts;
      }, [skills, assignments]);

      const subParts = [];
      if (data) {
        subParts.push('共 ' + statusCounts.all + ' 个技能');
        subParts.push('已激活 ' + (statusCounts.enabled || 0));
        if (statusCounts.orphan > 0) subParts.push('断链 ' + statusCounts.orphan);
        if (activeMode !== 'all') subParts.push('模式「' + modeLabelOf(activeMode) + '」含 ' + (modeCountOf[activeMode] || 0) + ' 个');
      } else if (loading) {
        subParts.push('扫描中…');
      }

      const rows = [
        {
          key: 'agent',
          label: '来源',
          value: agent,
          set: setAgent,
          options: [{ value: 'all', label: '全部' }].concat(
            agents.map(([name, count]) => ({ value: name, label: agentMeta(name).label + ' ' + count })),
          ),
        },
        groups.length > 0
          ? {
              key: 'group',
              label: '分组',
              value: groupFilter,
              set: setGroupFilter,
              options: [{ value: 'all', label: '全部' }].concat(
                groups
                  .filter((group) => (groupCounts[group.id] || 0) > 0)
                  .map((group) => ({
                    value: group.id,
                    label: group.label + ' ' + (groupCounts[group.id] || 0),
                  })),
              ),
            }
          : null,
      ].filter(Boolean);

      return h(
        'div',
        { className: 'ds-page' },
        h(
          'div',
          { className: 'ds-head' },
          h('h1', { className: 'ds-title' }, '技能管理'),
          h('p', { className: 'ds-sub' }, subParts.join(' · ')),
        ),
        h(
          'div',
          { className: 'ds-modes' },
          h('span', { className: 'ds-rowLabel' }, '模式'),
          h(
            'span',
            { className: 'ds-mode', key: 'all' },
            h(
              'button',
              {
                className: 'ds-modeBtn',
                type: 'button',
                disabled: modeBusy === 'all',
                'data-active': String(activeMode === 'all'),
                title: activeMode === 'all' ? '当前模式' : '切换到 all',
                style: activeMode === 'all' ? { borderBottomColor: ALL_MODE_COLOR } : undefined,
                onClick: () => applyModeAction('all'),
              },
              h('span', { className: 'ds-modeDot', style: { background: ALL_MODE_COLOR } }),
              'all',
              h('span', { className: 'ds-modeCount' }, String(modeCountOf.all || 0)),
            ),
          ),
          modes.map((mode) =>
            h(
              'span',
              { className: 'ds-mode', key: mode.id },
              h(
                'button',
                {
                  className: 'ds-modeBtn',
                  type: 'button',
                  disabled: modeBusy === mode.id,
                  'data-active': String(mode.id === activeMode),
                  title: mode.id === activeMode ? '当前模式' : '切换到 ' + mode.label,
                  style: mode.id === activeMode ? { borderBottomColor: mode.color || ALL_MODE_COLOR } : undefined,
                  onClick: () => applyModeAction(mode.id),
                },
                h('span', { className: 'ds-modeDot', style: { background: mode.color || ALL_MODE_COLOR } }),
                mode.label,
                h('span', { className: 'ds-modeCount' }, String(modeCountOf[mode.id] || 0)),
              ),
              h(
                'button',
                {
                  className: 'ds-modeEdit',
                  type: 'button',
                  'aria-label': '编辑模式 ' + mode.label,
                  title: '编辑此模式（增删技能）',
                  onClick: () => openEditMode(mode),
                },
                h(
                  'svg',
                  { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
                  h('path', { d: 'M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z' }),
                ),
              ),
              !mode.builtin
                ? h(
                    'button',
                    {
                      className: 'ds-modeX',
                      type: 'button',
                      'aria-label': '删除模式 ' + mode.label,
                      title: '删除此模式',
                      onClick: () => deleteModeAction(mode.id),
                    },
                    '×',
                  )
                : null,
            ),
          ),
          h(
            'button',
            {
              className: 'ds-modeAdd',
              type: 'button',
              onClick: openCreateMode,
            },
            '＋ 模式',
          ),
        ),
        h(
          'div',
          { className: 'ds-toolbar' },
          h('input', {
            className: 'ds-search',
            type: 'text',
            placeholder: '搜索技能名或描述…',
            value: query,
            onChange: (event) => setQuery(event.target.value),
          }),
          h(
            'button',
            {
              className: 'ds-btn ds-btnPrimary',
              type: 'button',
              onClick: () => {
                setCandidates(null);
                setSelected([]);
                setPermissionHint('');
                setInstallOpen(true);
              },
            },
            '＋ 安装',
          ),
          h(
            'button',
            { className: 'ds-btn', type: 'button', onClick: load, disabled: loading },
            loading ? '扫描中…' : '重新扫描',
          ),
          h(
            'div',
            { className: 'ds-viewToggle', role: 'group', 'aria-label': '视图切换' },
            h(
              'button',
              { type: 'button', 'data-active': String(view === 'card'), onClick: () => setView('card'), title: '卡片视图' },
              '卡片',
            ),
            h(
              'button',
              { type: 'button', 'data-active': String(view === 'table'), onClick: () => setView('table'), title: '表格视图' },
              '表格',
            ),
          ),
          h(
            'div',
            { className: 'ds-viewToggle ds-langToggle', role: 'group', 'aria-label': '描述语言' },
            h(
              'button',
              { type: 'button', 'data-active': String(descLang === 'zh'), onClick: () => setDescLang('zh'), title: '显示中文介绍（hover 看英文原文）' },
              '中',
            ),
            h(
              'button',
              { type: 'button', 'data-active': String(descLang === 'en'), onClick: () => setDescLang('en'), title: '显示英文原文（hover 看中文翻译）' },
              'EN',
            ),
          ),
        ),
        installOpen
          ? h(
              'div',
              {
                className: 'ds-modal ds-installModal',
                onClick: (event) => {
                  if (event.target === event.currentTarget) setInstallOpen(false);
                },
              },
              h(
                'div',
                { className: 'ds-dialog ds-installDialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': '安装技能' },
                h(
                  'div',
                  { className: 'ds-dialogHead' },
                  h(
                    'div',
                    { className: 'ds-dialogIcon' },
                    h(
                      'svg',
                      { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
                      h('path', { d: 'M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2' }),
                      h('path', { d: 'M12 12v9' }),
                      h('path', { d: 'm8 17 4 4 4-4' }),
                    ),
                  ),
                  h('h2', { className: 'ds-dialogTitle' }, '安装技能'),
                  h(
                    'button',
                    {
                      className: 'ds-dialogClose',
                      type: 'button',
                      'aria-label': '关闭',
                      onClick: () => {
                        setCandidates(null);
                        setInstallOpen(false);
                      },
                    },
                    '×',
                  ),
                ),
                h(
                  'div',
                  { className: 'ds-dialogBody' },
                  candidates
                    ? [
                        h(
                          'div',
                          { className: 'ds-candidateHead' },
                          h('span', { className: 'ds-candidateTitle' }, '发现 ' + candidates.length + ' 个技能，勾选要安装的：'),
                          h(
                            'button',
                            { className: 'ds-linkBtn', type: 'button', onClick: toggleSelectAll },
                            selected.length === candidates.length ? '取消全选' : '全选',
                          ),
                        ),
                        h(
                          'div',
                          { className: 'ds-candidateList' },
                          candidates.map((candidate) =>
                            h(
                              'label',
                              { className: 'ds-candidate', key: candidate.name },
                              h('input', {
                                type: 'checkbox',
                                checked: selected.includes(candidate.name),
                                onChange: () => toggleCandidate(candidate.name),
                              }),
                              h(
                                'span',
                                { className: 'ds-candidateText' },
                                h('span', { className: 'ds-candidateName' }, candidate.name),
                                candidate.description
                                  ? h('span', { className: 'ds-candidateDesc', title: candidate.description }, candidate.description)
                                  : null,
                              ),
                            ),
                          ),
                        ),
                      ]
                    : [
                        h(
                          'div',
                          { className: 'ds-installForm' },
                          h('p', { className: 'ds-installHint' }, '支持本地路径、Git 仓库或 NPM 包'),
                          h(
                            'div',
                            { className: 'ds-installInput' },
                            h(
                              'span',
                              { className: 'ds-installInputIcon', 'aria-hidden': 'true' },
                              h(
                                'svg',
                                { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
                                h('path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }),
                                h('path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }),
                              ),
                            ),
                            h('input', {
                              className: 'ds-search',
                              type: 'text',
                              autoFocus: true,
                              placeholder: '粘贴 Git 地址或输入命令…',
                              value: installValue,
                              onChange: (event) => {
                                setInstallValue(event.target.value);
                                if (permissionHint) setPermissionHint('');
                              },
                              onKeyDown: (event) => {
                                if (event.key === 'Enter') onInstall();
                              },
                            }),
                          ),
                        ),
                        permissionHint
                          ? h(
                              'div',
                              { className: 'ds-permission' },
                              h('div', { className: 'ds-permissionTitle' }, '需要权限'),
                              h('div', { className: 'ds-permissionDesc' }, '当前用户缺少权限，请在终端运行下面的命令后再点「安装」重试。'),
                              h('code', { className: 'ds-permissionCmd' }, permissionHint),
                              h(
                                'button',
                                {
                                  className: 'ds-btn',
                                  type: 'button',
                                  onClick: () => {
                                    if (navigator.clipboard) navigator.clipboard.writeText(permissionHint).catch(() => {});
                                  },
                                },
                                '复制命令',
                              ),
                            )
                          : null,
                      ],
                ),
                h(
                  'div',
                  { className: 'ds-dialogFoot' },
                  h(
                    'button',
                    {
                      className: 'ds-installCancel',
                      type: 'button',
                      onClick: () => {
                        if (candidates) setCandidates(null);
                        else setInstallOpen(false);
                      },
                    },
                    candidates ? '返回' : '取消',
                  ),
                  candidates
                    ? h(
                        'button',
                        {
                          className: 'ds-btn ds-btnPrimary',
                          type: 'button',
                          onClick: onInstallSelected,
                          disabled: installBusy || selected.length === 0,
                        },
                        installBusy ? '安装中…' : '安装所选（' + selected.length + '）',
                      )
                    : h(
                        'button',
                        {
                          className: 'ds-btn ds-btnPrimary',
                          type: 'button',
                          onClick: onInstall,
                          disabled: installBusy || installValue.trim() === '',
                        },
                        installBusy ? '安装中…' : '安装',
                      ),
                ),
              ),
            )
          : null,
        tagSkill
          ? h(
              'div',
              {
                className: 'ds-modal',
                onClick: (event) => {
                  if (event.target === event.currentTarget) setTagSkill(null);
                },
              },
              h(
                'div',
                { className: 'ds-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': '设置分组' },
                h(
                  'div',
                  { className: 'ds-dialogHead' },
                  h(
                    'div',
                    { className: 'ds-dialogIcon' },
                    h(
                      'svg',
                      { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
                      h('path', { d: 'M20.59 13.41 12 22l-9-9V4a1 1 0 0 1 1-1h9z' }),
                      h('circle', { cx: 7.5, cy: 7.5, r: 0.5 }),
                    ),
                  ),
                  h('h2', { className: 'ds-dialogTitle' }, '设置分组'),
                  h(
                    'button',
                    { className: 'ds-dialogClose', type: 'button', 'aria-label': '关闭', onClick: () => setTagSkill(null) },
                    '×',
                  ),
                ),
                h(
                  'div',
                  { className: 'ds-dialogBody' },
                  h(
                    'div',
                    { className: 'ds-candidateHead' },
                    h('span', { className: 'ds-candidateTitle' }, '为「' + tagSkill + '」勾选分组：'),
                  ),
                  h(
                    'div',
                    { className: 'ds-manageList', style: { marginTop: 4 } },
                    groups.map((group) =>
                      editId === group.id
                        ? h(
                            'div',
                            { className: 'ds-manageRow ds-manageRowEdit', key: group.id },
                            h('span', { className: 'ds-manageId' }, group.id),
                            h('input', {
                              className: 'ds-search',
                              type: 'text',
                              value: editLabel,
                              onChange: (event) => setEditLabel(event.target.value),
                            }),
                            h(ColorSwatches, { value: editColor, onChange: setEditColor }),
                            h('button', { className: 'ds-btn', type: 'button', onClick: () => setEditId(null) }, '取消'),
                            h(
                              'button',
                              {
                                className: 'ds-btn ds-btnPrimary',
                                type: 'button',
                                onClick: () => renameGroupAction(group.id, editLabel.trim() || group.label, editColor),
                              },
                              '保存',
                            ),
                          )
                        : h(
                            'div',
                            { className: 'ds-manageRow', key: group.id },
                            h(
                              'label',
                              { className: 'ds-manageCheck' },
                              h('input', {
                                type: 'checkbox',
                                checked: tagSelected.includes(group.id),
                                onChange: () => toggleTag(group.id),
                              }),
                              h('span', { className: 'ds-manageDot', style: { background: group.color } }),
                              h('span', { className: 'ds-manageLabel', title: group.id }, group.label),
                            ),
                            h(
                              'button',
                              {
                                className: 'ds-linkBtn',
                                type: 'button',
                                onClick: () => {
                                  setEditId(group.id);
                                  setEditLabel(group.label);
                                  setEditColor(group.color);
                                },
                              },
                              '编辑',
                            ),
                            h(
                              'button',
                              { className: 'ds-linkBtn ds-linkDanger', type: 'button', onClick: () => removeGroupAction(group.id) },
                              '删除',
                            ),
                          ),
                    ),
                    groups.length === 0
                      ? h('div', { className: 'ds-empty' }, '还没有分组，点下方「＋ 新建标签」创建。')
                      : null,
                  ),
                  inlineNew
                    ? h(
                        'div',
                        { className: 'ds-inlineNew' },
                        h('input', {
                          className: 'ds-search',
                          type: 'text',
                          autoFocus: true,
                          placeholder: '新标签 id（小写 kebab-case）',
                          value: inlineId,
                          onChange: (event) => setInlineId(event.target.value),
                          onKeyDown: (event) => {
                            if (event.key === 'Enter') createInlineGroup();
                          },
                        }),
                        h(ColorSwatches, { value: inlineColor, onChange: setInlineColor }),
                        h(
                          'div',
                          { className: 'ds-inlineNewBtns' },
                          h(
                            'button',
                            {
                              className: 'ds-btn',
                              type: 'button',
                              onClick: () => {
                                setInlineNew(false);
                                setInlineId('');
                              },
                            },
                            '取消',
                          ),
                          h(
                            'button',
                            {
                              className: 'ds-btn ds-btnPrimary',
                              type: 'button',
                              onClick: createInlineGroup,
                              disabled: inlineId.trim() === '',
                            },
                            '创建并勾选',
                          ),
                        ),
                      )
                    : h(
                        'button',
                        {
                          className: 'ds-linkBtn ds-inlineNewAdd',
                          type: 'button',
                          onClick: () => {
                            setInlineNew(true);
                            setInlineColor(TAG_COLORS[0]);
                          },
                        },
                        '＋ 新建标签',
                      ),
                ),
                h(
                  'div',
                  { className: 'ds-dialogFoot' },
                  h('button', { className: 'ds-btn', type: 'button', onClick: () => setTagSkill(null) }, '取消'),
                  h(
                    'button',
                    { className: 'ds-btn ds-btnPrimary', type: 'button', onClick: saveTags },
                    '保存',
                  ),
                ),
              ),
            )
          : null,
        modeEditor
          ? h(
              'div',
              {
                className: 'ds-modal',
                onClick: (event) => {
                  if (event.target === event.currentTarget) setModeEditor(null);
                },
              },
              h(
                'div',
                { className: modeEditor.isNew ? 'ds-dialog ds-modeDialog ds-modeCreateDialog' : 'ds-dialog ds-dialogWide ds-modeDialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': modeEditor.isNew ? '新建模式' : '编辑模式' },
                h(
                  'div',
                  { className: 'ds-dialogHead' },
                  h(
                    'div',
                    { className: 'ds-dialogIcon' },
                    h(
                      'svg',
                      { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
                      h('line', { x1: 21, x2: 14, y1: 4, y2: 4 }),
                      h('line', { x1: 10, x2: 3, y1: 4, y2: 4 }),
                      h('line', { x1: 21, x2: 12, y1: 12, y2: 12 }),
                      h('line', { x1: 8, x2: 3, y1: 12, y2: 12 }),
                      h('line', { x1: 21, x2: 16, y1: 20, y2: 20 }),
                      h('line', { x1: 12, x2: 3, y1: 20, y2: 20 }),
                      h('line', { x1: 14, x2: 14, y1: 2, y2: 6 }),
                      h('line', { x1: 8, x2: 8, y1: 10, y2: 14 }),
                      h('line', { x1: 16, x2: 16, y1: 18, y2: 22 }),
                    ),
                  ),
                  h('h2', { className: 'ds-dialogTitle' }, modeEditor.isNew ? '新建模式' : '编辑模式「' + (modeEditor.label || modeEditor.id) + '」'),
                  h(
                    'button',
                    { className: 'ds-dialogClose', type: 'button', 'aria-label': '关闭', onClick: () => setModeEditor(null) },
                    '×',
                  ),
                ),
                h(
                  'div',
                  { className: 'ds-dialogBody' },
                  modeEditor.isNew
                    ? [
                        h('input', {
                          className: 'ds-search',
                          type: 'text',
                          autoFocus: true,
                          placeholder: '模式名称（如：工作、研究）',
                          value: modeEditor.label,
                          onChange: (event) => setModeEditor({ ...modeEditor, label: event.target.value }),
                          onKeyDown: (event) => {
                            if (event.key === 'Enter') saveModeAction();
                          },
                        }),
                        h(
                          'p',
                          { className: 'ds-installHint' },
                          h(
                            'svg',
                            { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', style: { flex: 'none' } },
                            h('circle', { cx: 12, cy: 12, r: 10 }),
                            h('line', { x1: 12, y1: 16, x2: 12, y2: 12 }),
                            h('line', { x1: 12, y1: 8, x2: 12.01, y2: 8 }),
                          ),
                          '创建后，再通过模式右侧的编辑按钮导入 / 移除技能。',
                        ),
                      ]
                    : [
                        h(
                          'div',
                          { className: 'ds-modeSearch' },
                          h(
                            'span',
                            { className: 'ds-modeSearchIcon' },
                            h(
                              'svg',
                              { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
                              h('circle', { cx: 11, cy: 11, r: 7 }),
                              h('line', { x1: 21, x2: 16.65, y1: 21, y2: 16.65 }),
                            ),
                          ),
                          h('input', {
                            className: 'ds-search',
                            type: 'text',
                            autoFocus: true,
                            placeholder: '搜索要加入 / 移出的技能…',
                            value: modePickerQuery,
                            onChange: (event) => setModePickerQuery(event.target.value),
                          }),
                        ),
                        groups.length > 0
                          ? h(
                              'div',
                              { className: 'ds-modeTagFilter' },
                              h(
                                'button',
                                {
                                  key: 'all',
                                  type: 'button',
                                  className: 'ds-chip',
                                  'data-active': String(modePickerTag === 'all'),
                                  onClick: () => setModePickerTag('all'),
                                },
                                '全部',
                              ),
                              groups
                                .filter((group) => (groupCounts[group.id] || 0) > 0)
                                .map((group) =>
                                  h(
                                    'button',
                                    {
                                      key: group.id,
                                      type: 'button',
                                      className: 'ds-chip',
                                      'data-active': String(modePickerTag === group.id),
                                      onClick: () => setModePickerTag(group.id),
                                    },
                                    group.label,
                                  ),
                                ),
                            )
                          : null,
                        h(
                          'div',
                          { className: 'ds-candidateHead' },
                          h('span', { className: 'ds-candidateTitle' }, '已选 ', h('b', null, String(modeEditor.skills.length)), ' 个技能'),
                          h(
                            'button',
                            {
                              className: 'ds-linkBtn',
                              type: 'button',
                              onClick: () => toggleAllModeSkills(pickableSkills.map((skill) => skill.name)),
                            },
                            pickableSkills.length > 0 && pickableSkills.every((skill) => modeEditor.skills.includes(skill.name))
                              ? '清空'
                              : '全选',
                          ),
                        ),
                        h(
                          'div',
                          { className: 'ds-candidateList', style: { maxHeight: 300 } },
                          pickableSkills.map((skill) => {
                            const origin = originOf(skill);
                            const zh = (translations || {})[skill.name];
                            const descText = descLang === 'zh' && zh ? zh : skill.description;
                            const descTitle = descLang === 'zh' && zh ? skill.description : (zh || undefined);
                            const tags = (assignments[skill.name] || [])
                              .map((id) => groups.find((item) => item.id === id))
                              .filter(Boolean);
                            return h(
                              'label',
                              { className: 'ds-candidate', key: skill.name },
                              h('input', {
                                type: 'checkbox',
                                className: 'ds-check',
                                checked: modeEditor.skills.includes(skill.name),
                                onChange: () => toggleModeSkill(skill.name),
                              }),
                              h(
                                'span',
                                { className: 'ds-candidateText' },
                                h('span', { className: 'ds-candidateName' }, skill.name),
                                descText
                                  ? h('span', { className: 'ds-candidateDesc', title: descTitle || undefined }, descText)
                                  : null,
                                h(
                                  'span',
                                  { className: 'ds-candidateMeta' },
                                  h(SourceBadge, { agent: origin, sources: skill.sources }),
                                  tags.map((tag) =>
                                    h(
                                      'span',
                                      {
                                        key: tag.id,
                                        className: 'ds-tag',
                                        style: { color: 'color-mix(in srgb, ' + tag.color + ' 60%, #64748b)', background: 'color-mix(in srgb, ' + tag.color + ' 14%, #f8fafc)' },
                                        title: '分组：' + tag.label,
                                      },
                                      tag.label,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }),
                          pickableSkills.length === 0 ? h('div', { className: 'ds-empty' }, '没有匹配的技能。') : null,
                        ),
                      ],
                ),
                h(
                  'div',
                  { className: 'ds-dialogFoot' },
                  h('button', { className: 'ds-modeCancel', type: 'button', onClick: () => setModeEditor(null) }, '取消'),
                  h(
                    'button',
                    {
                      className: 'ds-btn ds-btnPrimary',
                      type: 'button',
                      disabled: modeEditor.isNew && modeEditor.label.trim() === '',
                      onClick: saveModeAction,
                    },
                    modeEditor.isNew ? '创建' : '保存',
                  ),
                ),
              ),
            )
          : null,
        confirmUninstall
          ? h(
              'div',
              {
                className: 'ds-modal',
                onClick: (event) => {
                  if (event.target === event.currentTarget) setConfirmUninstall(null);
                },
              },
              h(
                'div',
                { className: 'ds-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': '确认卸载' },
                h(
                  'div',
                  { className: 'ds-dialogHead' },
                  h(
                    'div',
                    { className: 'ds-dialogIcon ds-dialogIconDanger' },
                    h(
                      'svg',
                      { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
                      h('path', { d: 'M3 6h18' }),
                      h('path', { d: 'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2' }),
                      h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }),
                      h('path', { d: 'M10 11v6' }),
                      h('path', { d: 'M14 11v6' }),
                    ),
                  ),
                  h('h2', { className: 'ds-dialogTitle' }, '确认卸载'),
                  h(
                    'button',
                    { className: 'ds-dialogClose', type: 'button', 'aria-label': '关闭', onClick: () => setConfirmUninstall(null) },
                    '×',
                  ),
                ),
                h(
                  'div',
                  { className: 'ds-dialogBody' },
                  h('p', { className: 'ds-confirmText' }, '确定卸载「' + confirmUninstall.name + '」吗？'),
                  h(
                    'p',
                    { className: 'ds-confirmHint' },
                    confirmUninstall.status === 'orphan'
                      ? '该链接已断，清除后技能列表会更干净。'
                      : '卸载只会移除技能软链，源目录保留，需要时可重新安装。',
                  ),
                ),
                h(
                  'div',
                  { className: 'ds-dialogFoot' },
                  h('button', { className: 'ds-btn', type: 'button', onClick: () => setConfirmUninstall(null) }, '取消'),
                  h(
                    'button',
                    {
                      className: 'ds-btn ds-btnDanger',
                      type: 'button',
                      disabled: busy === confirmUninstall.name,
                      onClick: () => doUninstall(confirmUninstall),
                    },
                    busy === confirmUninstall.name ? '卸载中…' : '确认卸载',
                  ),
                ),
              ),
            )
          : null,
        notice
          ? h(
              'div',
              {
                className:
                  notice.kind === 'ok' ? 'ds-toast ds-toastOk' : notice.kind === 'warn' ? 'ds-toast ds-toastWarn' : 'ds-toast ds-toastErr',
                role: 'status',
              },
              h('span', { className: 'ds-toastDot' }),
              h('span', { className: 'ds-toastText' }, notice.text),
              h(
                'button',
                {
                  className: 'ds-toastClose',
                  type: 'button',
                  'aria-label': '关闭',
                  onClick: () => setNotice(null),
                },
                '×',
              ),
            )
          : null,
        h(
          'div',
          { className: 'ds-filters' },
          rows.map((row) =>
            h(
              'div',
              { className: 'ds-row', key: row.key },
              h('span', { className: 'ds-rowLabel' }, row.label),
              row.options.map((option) =>
                h(
                  'button',
                  {
                    key: option.value,
                    type: 'button',
                    className: 'ds-chip',
                    'data-active': String(row.value === option.value),
                    onClick: () => row.set(option.value),
                  },
                  option.label,
                ),
              ),
            ),
          ),
        ),
        error
          ? h(
              'div',
              { className: 'ds-notice' },
              h('div', { className: 'ds-error' }, '扫描失败：' + error),
              h('div', { className: 'ds-empty' }, 'host 端路由未就绪时，需要重启 DeepSeek Harness 让插件重新加载。'),
            )
          : null,
        loading && !data
          ? h('div', { className: 'ds-empty' }, '正在扫描各 agent 技能目录…')
          : null,
        !loading && data && visible.length === 0
          ? h('div', { className: 'ds-empty' }, skills.length === 0 ? '没有发现任何技能。' : '没有匹配的技能。')
          : null,
        visible.length > 0 && view === 'card'
          ? h(
              'div',
              { className: 'ds-grid' },
              visible.map((skill) =>
                h(SkillCard, {
                  key: skill.name,
                  skill,
                  busy,
                  onUninstall,
                  onTag: openTag,
                  onRemoveTag: removeTag,
                  onOpenFolder: openFolderAction,
                  translations,
                  descLang,
                  tags: (assignments[skill.name] || []).map((id) => {
                    const group = groups.find((item) => item.id === id);
                    return group || { id, label: id, color: '#64748b' };
                  }),
                }),
              ),
            )
          : null,
        visible.length > 0 && view === 'table'
          ? h(
              'div',
              { className: 'ds-tableWrap' },
              h(
                'table',
                { className: 'ds-table' },
                h(
                  'thead',
                  null,
                  h(
                    'tr',
                    null,
                    h('th', null, '技能'),
                    h('th', null, '来源'),
                    h('th', null, '描述'),
                    h('th', null, '标签'),
                    h('th', { style: { textAlign: 'right' } }, '操作'),
                  ),
                ),
                h(
                  'tbody',
                  null,
                  visible.map((skill) => {
                    const origin = originOf(skill);
                    const tags = (assignments[skill.name] || []).map((id) => groups.find((item) => item.id === id) || { id, label: id, color: '#64748b' });
                    const zh = (translations || {})[skill.name];
                    const showZh = descLang === 'zh' && zh;
                    const descText = showZh ? zh : skill.description;
                    const descTitle = showZh ? skill.description : zh;
                    const rowButtons = statusButtons(skill, {
                      busy: busy === skill.name,
                      danger: 'ds-tblBtn ds-tblBtnDanger',
                      onUninstall,
                    });
                    rowButtons.push(h('button', { key: 'tag', className: 'ds-tblBtn', type: 'button', onClick: () => openTag(skill), title: '设置分组' }, '标签'));
                    if (skill.path) {
                      rowButtons.push(
                        h(
                          'button',
                          { key: 'open', className: 'ds-pathBtn', type: 'button', title: '打开文件夹：' + skill.path, 'aria-label': '打开文件夹', onClick: () => openFolderAction(skill) },
                          h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z' })),
                        ),
                      );
                    }
                    return h(
                      'tr',
                      { key: skill.name },
                      h(
                        'td',
                        { className: 'ds-cellName' },
                        h(StatusTag, { status: skill.status }),
                        h('span', { className: 'ds-name', title: skill.name }, skill.name),
                      ),
                      h('td', null, h(SourceBadge, { agent: origin, sources: skill.sources })),
                      h('td', { className: 'ds-cellDesc', title: descTitle || undefined }, descText || '—'),
                      h(
                        'td',
                        { className: 'ds-cellTags' },
                        tags.length > 0
                          ? tags.map((tag) =>
                              h(
                                'span',
                                {
                                  key: tag.id,
                                  className: 'ds-tag',
                                  style: { color: tag.color, borderColor: 'color-mix(in srgb, ' + tag.color + ' 45%, transparent)', background: 'color-mix(in srgb, ' + tag.color + ' 12%, transparent)' },
                                  title: '分组：' + tag.label,
                                },
                                tag.label,
                              ),
                            )
                          : h('span', { className: 'ds-cellDesc' }, '—'),
                      ),
                      h('td', { className: 'ds-cellActions' }, rowButtons),
                    );
                  }),
                ),
              ),
            )
          : null,
        data && data.roots
          ? h(
              'details',
              { className: 'ds-roots' },
              h('summary', null, '扫描来源（' + data.roots.length + '）'),
              h(
                'ul',
                null,
                data.roots.map((root) =>
                  h(
                    'li',
                    { key: root.dir },
                    h('code', null, root.exists ? String(root.found) : '—'),
                    ' ',
                    root.label + ' · ' + root.dir + (root.exists ? '' : ' （不存在）'),
                  ),
                ),
              ),
            )
          : null,
      );
    }

    /* ------------------------------------------------------------------ */
    /* 聊天输入框：技能组（模式）多选                                      */
    /* ------------------------------------------------------------------ */

    function ChatModeSelect() {
      const [modes, setModes] = React.useState([]);
      const [selection, setSelection] = React.useState(['all']);
      const [open, setOpen] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const rootRef = React.useRef(null);
      const leaveTimer = React.useRef(null);

      const closeMenu = React.useCallback(() => {
        if (leaveTimer.current) {
          clearTimeout(leaveTimer.current);
          leaveTimer.current = null;
        }
        setOpen(false);
      }, []);

      const scheduleClose = React.useCallback(() => {
        if (leaveTimer.current) clearTimeout(leaveTimer.current);
        leaveTimer.current = setTimeout(() => setOpen(false), 160);
      }, []);

      const cancelClose = React.useCallback(() => {
        if (leaveTimer.current) {
          clearTimeout(leaveTimer.current);
          leaveTimer.current = null;
        }
      }, []);

      const refresh = React.useCallback(() => {
        fetchModes()
          .then((payload) => {
            setModes(Array.isArray(payload.modes) ? payload.modes : []);
            setSelection(Array.isArray(payload.chatModes) && payload.chatModes.length ? payload.chatModes : ['all']);
          })
          .catch(() => {});
      }, []);

      React.useEffect(() => {
        refresh();
      }, [refresh]);

      // 参照模型选择器：点击外部 / Esc 关闭。
      React.useEffect(() => {
        const onPointerDown = (event) => {
          if (rootRef.current && !rootRef.current.contains(event.target)) closeMenu();
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') closeMenu();
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
          document.removeEventListener('mousedown', onPointerDown);
          document.removeEventListener('keydown', onKeyDown);
        };
      }, [closeMenu]);

      const commit = React.useCallback((next) => {
        setBusy(true);
        post('/modes/apply-multi', { ids: next })
          .then((payload) => {
            if (Array.isArray(payload.selection)) setSelection(payload.selection);
          })
          .catch(() => {})
          .finally(() => setBusy(false));
      }, []);

      const toggle = React.useCallback(
        (id) => {
          if (busy) return;
          if (id === 'all') {
            commit(['all']);
            return;
          }
          const cur = Array.isArray(selection) && selection.length ? selection : ['all'];
          let next;
          if (cur.includes('all')) {
            next = [id];
          } else if (cur.includes(id)) {
            next = cur.filter((item) => item !== id);
            if (next.length === 0) next = ['all'];
          } else {
            next = [...cur, id];
          }
          commit(next);
        },
        [selection, busy, commit],
      );

      const openMenu = () => {
        cancelClose();
        setOpen((value) => {
          if (!value) refresh();
          return !value;
        });
      };

      const summary = (() => {
        if (!selection || selection.length === 0 || selection.includes('all')) return 'all';
        if (selection.length === 1) {
          const found = modes.find((mode) => mode.id === selection[0]);
          return found ? found.label : selection[0];
        }
        return selection.length + ' 个模式';
      })();

      const dotColor = selection && selection.length === 1 && selection[0] !== 'all'
        ? (modes.find((mode) => mode.id === selection[0]) || {}).color || ALL_MODE_COLOR
        : ALL_MODE_COLOR;

      const items = [{ id: 'all', label: 'all', color: ALL_MODE_COLOR, skills: null }].concat(
        modes.map((mode) => ({ id: mode.id, label: mode.label, color: mode.color || ALL_MODE_COLOR, skills: mode.skills || [] })),
      );

      return h(
        'div',
        {
          className: 'dsc-root',
          ref: rootRef,
          onMouseEnter: cancelClose,
          onMouseLeave: scheduleClose,
        },
        h(
          'button',
          {
            className: 'dsc-trigger',
            type: 'button',
            title: '技能组（模式）',
            'aria-expanded': open,
            onClick: openMenu,
          },
          h('span', { className: 'dsc-dot', style: { background: dotColor, color: dotColor } }),
          h('span', { className: 'dsc-triggerText' }, summary),
          h(
            'span',
            { className: 'dsc-caret' },
            h(
              'svg',
              { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
              h('polyline', { points: '6 9 12 15 18 9' }),
            ),
          ),
        ),
        open
          ? h(
              'div',
              { className: 'dsc-menu', role: 'listbox', 'aria-label': '技能组（模式）' },
              items.map((mode) => {
                const checked = selection.includes(mode.id);
                return h(
                  'label',
                  { key: mode.id, className: 'dsc-item', role: 'option', 'aria-selected': checked },
                  h('input', {
                    type: 'checkbox',
                    className: 'dsc-check',
                    checked,
                    onChange: () => toggle(mode.id),
                  }),
                  h('span', { className: 'dsc-itemDot', style: { background: mode.color } }),
                  h('span', { className: 'dsc-itemLabel' }, mode.label),
                  mode.skills === null ? null : h('span', { className: 'dsc-itemCount' }, String(mode.skills.length)),
                );
              }),
            )
          : null,
      );
    }

    /* ------------------------------------------------------------------ */
    /* 注册                                                                */
    /* ------------------------------------------------------------------ */

    return {
      inject: ['slots'],
      apply(ctx) {
        // 一个插件的 apply 抛异常会让整个 App 起不来（cordis 把 entry 标 failed），
        // 面板注册失败只该表现为「没有入口」，绝不该拦启动。
        try {
          ensureStyle();
        } catch (error) {
          console.error('[dsh-studio] style injection failed', error);
        }

        try {
          ctx.slots.inject('sidebar.panellist', () =>
            ctx.slots.register(
              { name: 'sidebar.panellist', id: PANEL_ID, order: 10, label: () => '技能' },
              SkillsGlyph,
            ),
          );

          ctx.slots.inject('main', function* () {
            yield ctx.slots.register({ name: 'main', key: PANEL_ID }, SkillsPanel);
          });
        } catch (error) {
          console.error('[dsh-studio] slot registration failed', error);
        }

        // 聊天输入框：模型选择框左边的「技能组」多选。单独兜底，注册失败不影响上面两个面板。
        try {
          ctx.slots.inject('conversation.input.right', () =>
            ctx.slots.register(
              { name: 'conversation.input.right', id: 'dsh-studio-chat-modes', order: 100, label: () => '技能组' },
              ChatModeSelect,
            ),
          );
        } catch (error) {
          console.error('[dsh-studio] chat mode slot registration failed', error);
        }
      },
    };
  },
});
