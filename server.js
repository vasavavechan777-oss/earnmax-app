
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const users = new Map();
const tasks = [
  {id:"t1", title:"Daily Check-in", reward:100, status:"active"},
  {id:"t2", title:"Complete Profile", reward:250, status:"active"},
  {id:"t3", title:"Demo Survey", reward:500, status:"active"}
];
const offers = [
  {id:"o1", title:"Partner Offer A", reward:1200, status:"active"},
  {id:"o2", title:"Partner Offer B", reward:2500, status:"active"}
];
const withdrawals = [];
const transactions = [];

function tokenFor(userId){ return crypto.createHash("sha256").update(userId+"|earnmax-demo").digest("hex"); }
function auth(req,res,next){
  const h=req.headers.authorization||"";
  const token=h.replace("Bearer ","");
  for(const [id,u] of users) if(token===tokenFor(id)){req.user=u; return next();}
  return res.status(401).json({error:"Login required"});
}
function addTx(userId,type,coins,note){
  transactions.unshift({id:"tx_"+Date.now()+"_"+Math.random().toString(16).slice(2),userId,type,coins,note,at:new Date().toISOString()});
}
app.get("/api/health",(req,res)=>res.json({ok:true,name:"EarnMax",rate:"100 Coins = ₹1"}));

app.post("/api/register",(req,res)=>{
  const {name,email,password}=req.body||{};
  if(!name||!email||!password) return res.status(400).json({error:"Name, email and password required"});
  const id="u_"+Date.now();
  const u={id,name,email,password,available:0,pending:0,totalEarned:0,withdrawn:0};
  users.set(id,u); res.json({token:tokenFor(id),user:{...u,password:undefined}});
});
app.post("/api/login",(req,res)=>{
  const {email,password}=req.body||{};
  const u=[...users.values()].find(x=>x.email===email&&x.password===password);
  if(!u) return res.status(401).json({error:"Demo account not found. Register first."});
  res.json({token:tokenFor(u.id),user:{...u,password:undefined}});
});
app.get("/api/me",auth,(req,res)=>res.json({user:{...req.user,password:undefined}}));

app.get("/api/tasks",(req,res)=>res.json(tasks));
app.get("/api/offers",(req,res)=>res.json(offers));

app.post("/api/tasks/:id/start",auth,(req,res)=>{
  const t=tasks.find(x=>x.id===req.params.id);
  if(!t) return res.status(404).json({error:"Task not found"});
  res.json({message:"Task started",task:t,devNote:"In production, reward is credited only after verified completion."});
});
app.post("/api/offers/:id/start",auth,(req,res)=>{
  const o=offers.find(x=>x.id===req.params.id);
  if(!o) return res.status(404).json({error:"Offer not found"});
  res.json({message:"Offer started",offer:o,devNote:"In production, provider postback verifies completion."});
});

/* Development-only verified completion simulator. Not a production reward endpoint. */
app.post("/api/dev/complete",auth,(req,res)=>{
  const {kind,id}=req.body||{};
  const item=(kind==="task"?tasks:offers).find(x=>x.id===id);
  if(!item) return res.status(404).json({error:"Item not found"});
  req.user.available += item.reward;
  req.user.totalEarned += item.reward;
  addTx(req.user.id,"reward",item.reward,`Verified demo completion: ${item.title}`);
  res.json({message:"Demo verified completion credited",coins:item.reward,user:{...req.user,password:undefined}});
});

app.get("/api/wallet",auth,(req,res)=>res.json({available:req.user.available,pending:req.user.pending,totalEarned:req.user.totalEarned,withdrawn:req.user.withdrawn,rate:"100 Coins = ₹1",minimum:1000}));

app.post("/api/withdraw",auth,(req,res)=>{
  const coins=Number(req.body?.coins);
  if(!Number.isInteger(coins)||coins<1000) return res.status(400).json({error:"Minimum withdrawal is 1,000 Coins"});
  if(coins>req.user.available) return res.status(400).json({error:"Not enough available Coins"});
  req.user.available-=coins; req.user.pending+=coins;
  const w={id:"wd_"+Date.now(),userId:req.user.id,coins,status:"pending",createdAt:new Date().toISOString()};
  withdrawals.unshift(w); addTx(req.user.id,"withdrawal", -coins,"Withdrawal request");
  res.json(w);
});

app.get("/api/admin/summary",(req,res)=>res.json({
  users:users.size, tasks:tasks.length, offers:offers.length,
  pendingWithdrawals:withdrawals.filter(x=>x.status==="pending").length,
  todayRevenue:"Demo"
}));
app.get("/api/admin/withdrawals",(req,res)=>res.json(withdrawals));
app.post("/api/admin/withdrawals/:id/:action",(req,res)=>{
  const w=withdrawals.find(x=>x.id===req.params.id);
  if(!w) return res.status(404).json({error:"Withdrawal not found"});
  if(w.status!=="pending") return res.status(400).json({error:"Already processed"});
  const u=users.get(w.userId);
  if(req.params.action==="approve"){u.pending-=w.coins;u.withdrawn+=w.coins;w.status="approved";}
  else if(req.params.action==="reject"){u.pending-=w.coins;u.available+=w.coins;w.status="rejected";addTx(u.id,"refund",w.coins,"Rejected withdrawal returned");}
  else return res.status(400).json({error:"Invalid action"});
  res.json(w);
});
app.get("/api/admin/transactions",(req,res)=>res.json(transactions));

app.get("/api/admin/users",(req,res)=>res.json([...users.values()].map(u=>({...u,password:undefined}))));

app.get("/api/admin",(req,res)=>res.sendFile(path.join(__dirname,"public","admin.html")));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

app.listen(process.env.PORT||3000,()=>console.log("EarnMax running"));
