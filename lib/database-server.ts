import 'server-only';
import postgres from 'postgres';
import {createDatabase} from './database.mjs';
let connection:ReturnType<typeof postgres>|undefined;
export function database(){
 if(!process.env.DATABASE_URL)throw new Error('Database configuration is missing.');
 connection??=postgres(process.env.DATABASE_URL,{prepare:false,max:3,idle_timeout:20,connect_timeout:10,ssl:process.env.NODE_ENV==='production'?'require':undefined,types:{bigint:{to:20,from:[20],serialize:String,parse:Number}}});
 return createDatabase(connection);
}
