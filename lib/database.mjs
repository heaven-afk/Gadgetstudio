// Preserve the existing parameterised API contract while using PostgreSQL.
// Values are always bound separately; no user input is interpolated into SQL.
export function compileSql(source){
 let out='',quote=null,n=0;
 for(let i=0;i<source.length;i++){const c=source[i];if(quote){out+=c;if(c===quote){if(source[i+1]===quote){out+=source[++i];}else quote=null;}continue;}if(c==='\''||c==='"'){quote=c;out+=c;}else if(c==='?')out+='$'+(++n);else out+=c;}
 return {sql:out,count:n};
}
export function createDatabase(client){
 class Statement{
  constructor(source,args=[]){this.source=source;this.args=args;}
  bind(...args){return new Statement(this.source,args);}
  async execute(connection=client){const q=compileSql(this.source);if(q.count!==this.args.length)throw new Error('SQL parameter count mismatch');return connection.unsafe(q.sql,this.args);}
  async first(){return (await this.execute())[0]||null;}
  async all(){return {results:await this.execute()};}
  async run(){const rows=await this.execute();return {meta:{changes:rows.count}};}
 }
 return {prepare:sql=>new Statement(sql),batch:statements=>client.begin(async transaction=>{const results=[];for(const statement of statements){const result=await statement.execute(transaction);results.push({meta:{changes:result.count}});}return results;})};
}
