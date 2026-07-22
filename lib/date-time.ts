export type TimestampValue=Date|string|number;
const countryTimeZones:Record<string,string>={india:"Asia/Kolkata",bangladesh:"Asia/Dhaka",nepal:"Asia/Kathmandu",pakistan:"Asia/Karachi","united arab emirates":"Asia/Dubai",uae:"Asia/Dubai","united kingdom":"Europe/London",uk:"Europe/London","united states":"America/New_York",usa:"America/New_York"};
let selectedCountry:string|null=null;

export function isValidTimeZone(value:unknown):value is string{if(typeof value!=="string"||!value)return false;try{new Intl.DateTimeFormat("en",{timeZone:value}).format(0);return true}catch{return false}}
export function browserTimeZone(){try{const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;return isValidTimeZone(zone)?zone:null}catch{return null}}
export function countryTimeZone(country?:string|null){return country?countryTimeZones[country.trim().toLowerCase()]??null:null}
export function setDateTimeFallbackCountry(country?:string|null){selectedCountry=country?.trim()||null}
export function displayTimeZone(country?:string|null){return browserTimeZone()??countryTimeZone(country??selectedCountry)??"UTC"}
const locale=()=>typeof navigator!=="undefined"&&navigator.language?navigator.language:undefined;
const dateValue=(value:TimestampValue)=>{const date=value instanceof Date?value:new Date(value);return Number.isNaN(date.getTime())?null:date};
export function formatLocalDateTime(value:TimestampValue|null|undefined,country?:string|null){const date=value==null?null:dateValue(value);return date?new Intl.DateTimeFormat(locale(),{timeZone:displayTimeZone(country),year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(date):"—"}
export function formatLocalDate(value:TimestampValue|null|undefined,country?:string|null){const date=value==null?null:dateValue(value);return date?new Intl.DateTimeFormat(locale(),{timeZone:displayTimeZone(country),dateStyle:"medium"}).format(date):"—"}
export function formatLocalTime(value:TimestampValue|null|undefined,country?:string|null,includeSeconds=false){const date=value==null?null:dateValue(value);return date?new Intl.DateTimeFormat(locale(),{timeZone:displayTimeZone(country),hour:"numeric",minute:"2-digit",second:includeSeconds?"2-digit":undefined,timeZoneName:"short"}).format(date):"—"}
export function localDateKey(value:TimestampValue,country?:string|null){const date=dateValue(value);if(!date)return"";const parts=new Intl.DateTimeFormat("en-CA",{timeZone:displayTimeZone(country),year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date),part=(type:string)=>parts.find(item=>item.type===type)?.value??"";return`${part("year")}-${part("month")}-${part("day")}`}
