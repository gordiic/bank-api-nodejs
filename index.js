const express = require('express');
const app = express();
const   uuid  = require('uuid');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

var axios = require('axios');

const cors = require('cors');

const { createClient } =require("@supabase/supabase-js");

const { createLogger, format, transports } = require("winston");

//database pw:12345678910nebojsa
const supabaseUrl = 'https://qxvuqmzydpwwqvldclve.supabase.co'
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dnVxbXp5ZHB3d3F2bGRjbHZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY3MjE1NjAwNCwiZXhwIjoxOTg3NzMyMDA0fQ.P5kK_j5vTzKzNcEZOVEkOqIMmAetTFEND7Q7PCTYTnI"
const supabase = createClient(supabaseUrl, supabaseKey)
const bankIdentifier="123456";
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
app.post('/start-payment', jsonParser, async(req, res) => 
{
  console.log("start payment");
  // const paymentInfo={
  //   merchant_id:merchantBankId,
  //   merchant_password:merchanBankPassword,
  //   amount:total,
  //   merchant_order_id:paymentId,
  //   merchant_timestamp:Math.round(+new Date()/1000),
  //   success_url:pspSuccessUrl,
  //   failed_url:pspFailedUrl,
  //   error_url:pspErrorUrl
  // }
  const payment_info=req.body;
  try{
    const id= uuid.v4();
    const merchant_id= payment_info.merchant_id;
    const timestamp= payment_info.merchant_timestamp;
    const amount= Number(payment_info.amount);
    const completed= false;
    const success_url=payment_info.success_url;
    const failed_url=payment_info.failed_url;
    const error_url=payment_info.error_url;
    const {data,error}= await supabase
    .from('transactions')
    .insert(
      {id:id,merchant_id:merchant_id,timestamp:timestamp,amount:amount,success_url:success_url,failed_url:failed_url,error_url:error_url,completed:completed}
      )
  .single();
  
  
  console.log(data);
  res.send("url fronta banke");
    //provjeriti postoji li taj korisnik banke, da li je okej, ako jeste kreirati transakciju i njen id i cuvati podatke u neku tabelu
  //vratitit url fronta banke i id transakcije
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
app.get('/finish-payment', jsonParser, async(req, res) => 
{
  //TEODORA 5.1.2023 17:12  ->> 
    // nije mi jasno sta je acquirer timestamp
    //Kako je meni logicno: metoda koju smo zaj napravili upise u bazu i vrati pspu link do bank fronta...onda se redirektuje na taj url i tamo
    // popunjava info: pan,csc,exp_date,name....e sad nama treba id od platioca al kako ja da znam svoj id kad placam nesto...to je prob al dobro mozda nam ne treba nz
    //trebalo bi da mi taj id nadjemo preko pana al aj nz...
    //zatim te info koje sam navela dodju u ovu metodu finish payment, trazi se taj pan u bazi ove banke ako se nadje proverava se balans, ako ima sredstava skine mu se,
    //mercentu se doda i redirektuje se na one uspesne urlove i stavi se u bazi da je transakcija completed
    //problem je sto se ovo moje ne poklapa sa ovim sto si ispod napisao a verujem da si iz specifikacije pisao

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
    try{
       
      }
      catch(e)
      {
        console.log(e);
      }
    
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
app.get('/finish-payment-fromanouther-bank', jsonParser, async(req, res) => 
{
    //azurirati podatke o korisniku i kreirati u tabelu transakciju da se desila

    try{
       
      }
      catch(e)
      {
        console.log(e);
      }
    
});