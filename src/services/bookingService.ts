export type BookingRequest={name:string;phone:string;email?:string;date?:string;packageId?:string;notes?:string;paymentMethod?:string};
export type BookingResult={ok:boolean;reference:string};
export async function submitBooking(request:BookingRequest):Promise<BookingResult>{
  // Integration boundary: replace this mock with Wix/Velo, REST, or another backend adapter.
  await new Promise(resolve=>setTimeout(resolve,350));
  return {ok:true,reference:"BSDA-DEMO-"+Date.now().toString().slice(-6)};
}