import http from 'node:http';
const s = http.createServer((req,res)=>{
  let b=''; req.on('data',c=>b+=c); req.on('end',()=>{
    if (req.url === '/v1/chat/completions' && req.method==='POST'){
      res.writeHead(200,{'Content-Type':'application/json'});
      res.end(JSON.stringify({choices:[{message:{content:'<b>THE ARCHIVE REMEMBERS</b> The Cartographer crosses a sector that has been waiting under a dead star since before the collapse, and the instruments disagree about whether it is still there. The record is kept anyway. '+ 'The void does not answer, but it does not object either.'}}]}));
    } else { res.writeHead(404); res.end('{}'); }
  });
});
s.listen(8899, ()=>console.log('mock provider ready'));
