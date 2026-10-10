import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';

export function createHueStore(db,keyHex){
  if(!/^[a-f\d]{64}$/i.test(keyHex??''))throw new Error('HUE_ENCRYPTION_KEY must contain 64 hexadecimal characters.');
  const key=Buffer.from(keyHex,'hex');
  function storageError(){const error=new Error('Hue storage is unavailable. Apply the Hue SQL migration and check SUPABASE_SECRET_KEY in Render.');error.status=503;return error;}
  return {
    async read(user){
      const {data,error}=await db.from('hue_connections').select('encrypted_payload').eq('user_id',user).maybeSingle();
      if(error)throw storageError();if(!data)return null;
      const envelope=data.encrypted_payload;
      try{const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));decipher.setAAD(Buffer.from(user));decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data,'base64')),decipher.final()]).toString());}
      catch{const error=new Error('Saved Hue credentials cannot be decrypted. Restore the original HUE_ENCRYPTION_KEY, or clear the saved Hue row in Supabase before reconnecting.');error.status=503;throw error;}
    },
    async save(user,value){
      const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(user));
      const encrypted=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);
      const {error}=await db.from('hue_connections').upsert({user_id:user,encrypted_payload:{iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')},updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(error)throw storageError();
    }
  };
}
