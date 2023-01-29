const express = require('express');
const app = express();
const { v4 } = require('uuid');
const dbRepo=require('./dbRepository');
const functions=require('./functions');
const qr=require('qrcode');

var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

var axios = require('axios');

const cors = require('cors');



const { createLogger, format, transports } = require("winston");

//database pw:12345678910nebojsa
const cscUrl='http://localhost:9000'
var bankIdentifier="123456";
const bankFrontUrl='http://localhost:3002';
const pccUrl='http://localhost:9000';
const logLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};
app.use(cors({
    origin: '*'
}));
const logger = createLogger({
  levels:logLevels,
  transports: [new transports.File({ filename: "file.log" })],
  exceptionHandlers: [new transports.File({ filename: "exceptions.log" })],
  rejectionHandlers: [new transports.File({ filename: "rejections.log" })],
});
app.listen(8000, () => {
 
  // console.log(new Date());
  // console.log(Date.now())
  //console.log("enter bank db info...");
  //dbRepo.setupDB();
 
  console.log(`Server Started on ${8000}`);

}
  );


//poslati zahtjev za placanjem sa psp, zapravo odabir nacina placanja preko psp pogadja ovaj endpoint
//kreira se transakcija koja nije zavrsena
//na osnovu merchant_id, merchant_password, amount, merchant_order_id, merchant_timestamp,_ success_url, failed_url, error_url
//kreiraju se payment_url i payment_id
//url je url fronta banke od koga se ponovo salje zahtjev sa payment_id i bek vraca podatke transakcije i popunjava se forma
//PAYMENT_URL (tip URL – String(256)) i PAYMENT_ID (tip Number(10)),

//Dolazni podaci
// {
//   merchant_id,
//   merchant_password,
//   amount,
//   merchant_order_id,
//   merchant_timestamp,
//   success_url,
//   failed_url,
//   error_url
// }
//Odlazni podaci (posebna tabela koju treba prosiriti amountom itd...)
// {
//   payment_url,
//   payment_id
// }
app.get('/get-payment-info',jsonParser,async(req,res)=>
{
  console.log('get-payment-info');
  console.log(req.query);
  
  const payment=await dbRepo.getPaymentRequestByPaymentId(req.query.id);
  console.log(payment);
  const merchant=await dbRepo.getAccountById(payment.merchant_id);
  merchant.balance=0;
  merchant.exp_date=0;/// e sad ovde treba da od ovih podataka generisem qr i da saljem na front znaci qr,paymentId i neke podatke o merchantu da se ispise kao kome se uplacuje novac i cao
  //QR kod treba da sadrži valutu i iznos koji se plaća, broj računa primaoca, naziv primaoca plaćanja itd.
  const qrObject={
    c:'USD',
    a:payment.amount,
    m:merchant.pan,
    n:merchant.name
  };
  const qrCode=await functions.generateQr(qrObject);  
  res.send({payment:payment,merchant_account:merchant.pan,merchant_name:merchant.name,qr:qrCode});
});
app.post('/start-payment', jsonParser, async(req, res) =>
{
  console.log("start payment");
  const payment_info=req.body;
  try{
    const payment={
      payment_id:payment_info.payment_id,
      id:v4(),
      merchant_id: payment_info.merchant_id,
      timestamp:payment_info.merchant_timestamp,
      amount:Number(payment_info.amount),
      completed:false,
      success_url:payment_info.success_url,
      failed_url:payment_info.failed_url,
       error_url:payment_info.error_url
    }
    const data= await dbRepo.addPaymentRequest(payment);


  console.log(data);
  console.log(`${bankFrontUrl}?id=${payment.id}`);
 // res.send(`${bankFrontUrl}?id=${payment.id}`);//saljemo url fronta a on se onda redirektuje na taj url i dodaje payment id u query????
                          //da bi bank front mogao payment id da prosledi metodi finish-payment ovde na apiju banke
   const resp={
    url:bankFrontUrl,
    paymentId:payment.id,
  }
  res.send(resp);
  }
  catch(e)
  {
    console.log(e);
  }


});
app.post('/start-payment-qr', jsonParser, async(req, res) =>
{
  console.log("start payment qr");
  const payment_info=req.body;
  try{
    const payment={
      payment_id:payment_info.payment_id,
      id:v4(),
      merchant_id: payment_info.merchant_id,
      timestamp:payment_info.merchant_timestamp,
      amount:Number(payment_info.amount),
      completed:false,
      success_url:payment_info.success_url,
      failed_url:payment_info.failed_url,
       error_url:payment_info.error_url
    }
    console.log(payment);
    const data= await dbRepo.addPaymentRequest(payment);
  console.log(data);
  const resp={
    url:`${bankFrontUrl}/qr`,
    paymentId:payment.id,
  }
  res.send(resp);
  }
  catch(e)
  {
    console.log(e);
  }


});


//kada se popuni forma podacima za placanje gadja se ovaj endpoint
//Dolazni podaci
// {
//   pan,
//   csc,
//   card_h_name,
//   exp_date
// }
app.post('/finish-payment', jsonParser, async(req, res) =>
{
  try{
    console.log(`finish payment: data->\n${JSON.stringify(req.body)}`);
    console.log('1')
    const pan=req.body.pan;
    const csc=req.body.csc;
    const name=req.body.card_h_name;
    const exp_date=req.body.exp_date;
    const payment_id=req.body.payment_id;
    console.log('11')
    const amount=await dbRepo.getAmount(payment_id);//   change->  !!!!!!!!!!!!!!from payment-requests db
    console.log('2')
    const merchant_id= await dbRepo.getMerchantByPaymentId(payment_id);
    console.log('3')
    const data=await dbRepo.getAccountByPan(pan);
    console.log('4')
    console.log(data);
    const timestamp=Date.now();
    const payment_request=await dbRepo.getPaymentRequestByPaymentId(payment_id);
    console.log(payment_request);
    if(data===null)
    {
      console.log('saljemo zahtev pcc-u');
      const pccRequestData={
        pan:pan,
        csc:csc,
        card_h_name:name,
        exp_date:exp_date,
        timestamp:timestamp,
        transaction_id:payment_id,
        amount:amount
      };
      const resp= await dbRepo.addTransaction({id:payment_id,merchant_id:merchant_id,payer_id:null,state:'pending',amount:amount,timestamp:timestamp});//payer_id:null jer mi ne znamo njegov id, samo acc num
      const response=await axios.post(`${cscUrl}/payment-request`,pccRequestData);
      console.log(response.data);///ovde puca al sve pre toga je ok!!!!!!!!!!!
      const payment_request=await dbRepo.getPaymentRequestByPaymentId(response.transaction_id);
      if(response.data.successful)
      {
        //uvecaj balance
        const merchantAccount = await dbRepo.getAccountById(merchant_id);
        const newBalanceMerchant=merchantAccount.balance+amount;
        const dataMerchant= await dbRepo.updateBalance(merchant_id,newBalanceMerchant);
        const date=await dbRepo.updateTransactionState(response.transaction_id,'executed');
        res.send(`${payment_request.success_url}?payment_id=${payment_request.payment_id}`);
      }
      else
      {
        const date=await dbRepo.updateTransactionState(response.transaction_id,'failed');
        
      }
    }
    else if( data.length>0)//payer is in this bank db
    {
      console.log("payer info->",data[0])
      const account=data[0];
      
      if(functions.checkAccountInfo({csc,exp_date,name},account))
        {
          if(account.balance>=amount)
          {
            console.log('ima dovoljno stanja na racunu');
            const data = await dbRepo.getAccountById(merchant_id);
            const merchantAccount=data[0];
            const newBalancePayer=account.balance-amount;
            const newBalanceMerchant=merchantAccount.balance+amount;
            const dataPayer= await dbRepo.updateBalance(account.id,newBalancePayer);
            const dataMerchant= await dbRepo.updateBalance(merchant_id,newBalanceMerchant);
            ///upis transakcije u bazu
            const resp= await dbRepo.addTransaction({id:payment_id,merchant_id:merchant_id,payer_id:account.id,state:'executed',amount:amount,timestamp:timestamp})
            res.send(`${payment_request.success_url}?payment_id=${payment_request.payment_id}`);
          }
          else{//ako nema dovoljno stanja upisujemo transakciju ali successful=false
            console.log('nema dovoljno stanja na racunu');
            const resp= await dbRepo.addTransaction({id:payment_id,merchant_id:merchant_id,payer_id:account.id,state:'failed',amount:amount,timestamp:timestamp});
            res.send(`${payment_request.failed_url}?payment_id=${payment_request.payment_id}`);
          }
        }
    }
    else//we call csc for information about this payers bank
    {
      
    }
  }
  catch(e)
  {
    res.send(`${payment_request.error_url}?payment_id=${payment_request.payment_id}`);
  }
  
  // Na sajtu banke prodavca, kupac unosi PAN, security code, card holder name i datum do kada kartica važi.
  // Vrši se provera podataka.
  // Ukoliko je banka prodavca ista kao i banka kupca, vrši se provera raspoloživih sredstava na računu kupca,
  // rezervišu se sredstva, ukoliko postoje, i dalji tok skače na korak 7.
  // U suprotnom, banka prodavca generiše ACQUIRER_ORDER_ID (ID transakcije - tip Number(10)) i  ACQUIRER_TIMESTAMP
  // i zajedno sa podacima o kartici šalje zahtev ka PCC.
  //Odlazni podaci-zahtjev servicu kartica
  // {
  //   acquirer_order_id,
  //   acquirer_timestamp,
  //   pan,
  //   csc,
  //   card_h_name,
  //   exp_date
  // }


  //7. Banka prodavca prosleđuje podatke o stanju transakcije,
  //uz MERCHANT_ORDER_ID, ACQUIRER_ORDER_ID, ACQUIRER_TIMESTAMP i PAYMENT_ID PSP-u.
  //Kupac se prebacuje na stranicu koja prikazuje status izvršavanja transakcije (uspeh, neuspeh, greška).
  //U slučaju uspeha, dobija pristup uslugama koje je kupio.
  //Odlazni podaci
  // {
  //   merchant_order_id, //odozgo iz najgornje metode
  //   acquirer_order_id,
  //   acquirer_timestamp,
  //   payment_id,// +podaci o uspjehu/neuspjehu transakcije
  // }
});

//endpoint koji gadja card service ukoliko je korisnik pripadnik tudje banke
//Dolazni podaci od card service koji su proslijedjeni od banke prodavca
  // {
  //   acquirer_order_id,
  //   acquirer_timestamp,
  //   pan,
  //   csc,
  //   card_h_name,
  //   exp_date
  // }
  //Banka kupca prihvata zahtev i, ako je ispravan i kupac ima dovoljno novca, vrši se rezervacija sredstava. (vjerovatno se i amount salje)
  // Ocigledno ce trebati da banci javi prva banka da je odradjeno da vise ne bi bilo rezervisano vec izvrseno placanje
  // Ova metoda ce vratiti podatke ukoliko je sve super rezervisano i na osnovu ovog issuer_order_id kada mu ga posalje on ce tu transakciju komitovati
  //Banka kupca prosleđuje rezultat transakcije nazad PCC-u. Odgovor, pored rezultata transakcije,
  //treba da sadrži i ACQUIRER_ORDER_ID, ACQUIRER_TIMESTAMP, ISSUER_ORDER_ID i ISSUER_TIMESTAMP.
  //Odlazni podaci
  // {
  //   acquirer_order_id,
  //   acquirer_timestamp,
  //   issuer_order_id,
  //   issuer_timestamp
  // }

  // req.body->
  // const pccRequestData={
  //   pan:pan,
  //   csc:csc,
  //   card_h_name:name,
  //   exp_date:exp_date,
  //   timestamp:timestamp,
  //   transaction_id:id,
  //   amount:amount
  // };
  {
    //   successful,
    //   acquirerer_order_id,
    //   acquirerer_timestamp,
    //   issuer_order_id,
    //   issuer_timestamp
    // }
app.post('/extern-payment-request', jsonParser, async(req, res) =>
{
    //azurirati podatke o korisniku i kreirati u tabelu transakciju da se desila
    const info=req.body;
    const info2={
      csc:info.csc,
      name:info.card_h_name,
      exp_date:info.exp.date
    }
    info.newTimestamp=Date.now();
    info.id=v4();
    const data=dbRepo.getAccountByPan(info.pan);
    if(data.length>0)
    {
      if(functions.checkAccountInfo(info2,data[0]))
      {
        if(data[0].balance>=info.amount)
        {
          const data=dbRepo.updateBalance(data[0].id,data[0].balance-info.amount);
          const resp= await addTransaction({id:info.id,merchant_id:'',payer_id:data[0].id,successful:'executed',amount:info.amount,timestamp:info.newTimestamp});
          res.send({successful:true,acquirerer_id:info.transaction_id,acquirerer_timestamp:info.timestamp,issuer_id:info.id,issuer_timestamp:info.newTimestamp});
        }
        else{//ako nema dovoljno stanja upisujemo transakciju ali successful=false
          const resp= await addTransaction({id:info.id,merchant_id:'',payer_id:account.id,successful:'failed',amount:info.amount,timestamp:info.newTimestamp});
          res.send({successful:false,acquirerer_id:info.transaction_id,acquirerer_timestamp:info.timestamp,issuer_id:info.id,issuer_timestamp:info.newTimestamp});
        }
      }
    }
  })};