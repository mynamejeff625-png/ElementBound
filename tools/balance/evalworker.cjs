// Evaluate one stat delta on the real 1.13.0 rules: prints {rate,...} JSON.
const base=require(require('path').resolve(__dirname,'../../lib/cardCatalog.js')),{measure}=require('./mech.cjs');
const [delta,seeds,tag]=[JSON.parse(process.argv[2]),+process.argv[3],process.argv[4]];
const B={},H={};for(const [el,list] of Object.entries(base.BASE))B[el]=list.map(c=>{const x=delta[`${el}:${c[0]}`]||{};return[c[0],c[1],c[2]+(x.a||0),c[3]+(x.h||0),c[4],c[5]]});
for(const [el,list] of Object.entries(base.HYBRID_CARDS))H[el]=list.map(c=>{if(c.type!=='MANIFESTATION')return c;const x=delta[`${el}:${c.n}`]||{};return{...c,a:c.a+(x.a||0),h:c.h+(x.h||0)}});
process.stdout.write(JSON.stringify(measure({},seeds,tag,[],{...base,BASE:B,HYBRID_CARDS:H})));
