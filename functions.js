const qr=require('qrcode');
exports.checkAccountInfo=function(payerInfo,dbInfo)
{
    const month=Number(dbInfo.exp_date.split("/")[0]);//"12/25"
    const year=Number(dbInfo.exp_date.split("/")[1]);
    const today=new Date();
    if(payerInfo.csc===dbInfo.csc
        && payerInfo.exp_date===dbInfo.exp_date
        && ((year > today.getFullYear()%100 && month >today.getMonth()) || (year === today.getFullYear()%100 && month >today.getMonth()))
        && payerInfo.name===dbInfo.name)
        {
            return true;
        }
    else{
        return false;
    }
}
exports.generateQr=async function(info)
{
 
   const data=await qr.toDataURL(JSON.stringify(info));
   return data;
}