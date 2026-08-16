/* ─── Types ─── */
export interface HospitalFull {
  id: number; name: string; address: string; lat: number; lon: number;
  distance: number; phone: string; isOpen: boolean; emergency: boolean;
  is24x7: boolean; specializations: string[]; diagnosticsAvailable: boolean;
  pharmacyAvailable: boolean; insurance: string[]; rating: number; beds: number;
  image: string; established: number; type: string; description: string;
}
export interface DoctorFull {
  id: number; name: string; photo: string; qualification: string;
  specialization: string; experience: number; languages: string[];
  hospital: string; hospitalId: number; phone: string; rating: number;
  consultationFee: number; available: boolean; gender: 'male' | 'female';
}
export interface LabCenter {
  id: number; name: string; address: string; distance: number; timings: string;
  phone: string; homeCollection: boolean; tests: string[]; rating: number;
  isOpen: boolean; startingPrice: number; lat: number; lon: number;
}
export interface PharmacyStore {
  id: number; name: string; address: string; distance: number; isOpen: boolean;
  delivery: boolean; phone: string; rating: number; is24x7: boolean; lat: number; lon: number;
}
export interface HealthPackage {
  id: number; name: string; provider: string; price: number; originalPrice: number;
  tests: string[]; category: string; description: string; testsCount: number;
  homeCollection: boolean;
}

/* ─── Hospital Images (cycling) ─── */
const HOSP_IMGS = [
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800",
  "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800",
  "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800",
  "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800",
  "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800",
];
const img = (i: number) => HOSP_IMGS[i % HOSP_IMGS.length];

/* ─── 30 Hospitals (Hubli area base: 15.3647, 75.124) ─── */
export const HOSPITALS: HospitalFull[] = [
  { id:1,  name:"Apollo Hospital Hubli",          address:"154 Vidyanagar, Hubli",             lat:15.373, lon:75.138, distance:1.5,  phone:"+91 836 242 8888", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Cardiology","Neurology","Orthopedics","Oncology","Gastroenterology","Nephrology"], diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Bajaj Allianz","ICICI Lombard","New India"],    rating:4.8, beds:500, image:img(0), established:2003, type:"multi-specialty", description:"Apollo Hospital Hubli is a premier multi-specialty hospital delivering world-class healthcare with 500 beds and 30+ departments." },
  { id:2,  name:"KLE Hospital & Research Centre",  address:"JNMC Campus, Nehru Nagar, Belagavi", lat:15.358, lon:75.119, distance:0.8,  phone:"+91 831 247 0001", isOpen:true,  emergency:true,  is24x7:true,  specializations:["General Medicine","Surgery","Obstetrics","Pediatrics","ENT"],                      diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Ayushman Bharat","Star Health","New India","United India"],              rating:4.5, beds:1200, image:img(1), established:1986, type:"teaching",         description:"KLE Hospital is a leading teaching hospital affiliated with JNMC, offering comprehensive medical education and patient care." },
  { id:3,  name:"KIMS Hospital",                   address:"Plot 1-112, Hubli-Dharwad Road",     lat:15.381, lon:75.147, distance:2.3,  phone:"+91 836 235 7200", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Cardiology","Neurosurgery","Orthopedics","Urology","Oncology"],                     diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Reliance","ICICI Lombard","Bajaj Allianz"],   rating:4.6, beds:650, image:img(2), established:2005, type:"multi-specialty", description:"KIMS Hospital provides advanced tertiary care with cutting-edge technology across 20+ specialties." },
  { id:4,  name:"Manipal Hospital Hubli",          address:"Opp. Railway Station, Hubli",        lat:15.362, lon:75.108, distance:1.6,  phone:"+91 836 422 5000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Cardiology","Orthopedics","Gastroenterology","Dermatology","Psychiatry"],             diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Bajaj Allianz","Religare","ICICI Lombard"],  rating:4.7, beds:400, image:img(3), established:2010, type:"multi-specialty", description:"Manipal Hospital brings international-standard care to Hubli with a focus on patient safety and clinical excellence." },
  { id:5,  name:"Fortis Hospital Dharwad",         address:"Dharwad-Hubli Bypass Road",          lat:15.392, lon:75.162, distance:4.2,  phone:"+91 836 350 0000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Cardiology","Neurology","Oncology","Renal","Liver Transplant"],                      diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Bajaj Allianz","ICICI Lombard","SBI General"], rating:4.6, beds:350, image:img(4), established:2012, type:"multi-specialty", description:"Fortis Hospital Dharwad is part of the national Fortis network bringing tertiary-level care to North Karnataka." },
  { id:6,  name:"Narayana Health City",            address:"Gokul Road, Hubli",                  lat:15.350, lon:75.100, distance:3.0,  phone:"+91 836 266 8000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Cardiology","Cardiac Surgery","Vascular","Pediatric Cardiology"],                    diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","Ayushman Bharat","HDFC ERGO","New India"],                rating:4.9, beds:300, image:img(0), established:2008, type:"specialty",        description:"Narayana Health is India's leading cardiac care chain offering affordable world-class heart treatment." },
  { id:7,  name:"Columbia Asia Hospital",          address:"PB Road, Vidyanagar, Hubli",         lat:15.344, lon:75.093, distance:4.1,  phone:"+91 836 414 0000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["General Surgery","Internal Medicine","Obstetrics","Orthopedics","Pediatrics"],          diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Bajaj Allianz","United India"],              rating:4.4, beds:280, image:img(1), established:2014, type:"multi-specialty", description:"Columbia Asia brings international hospital management standards to Hubli with comprehensive outpatient and inpatient care." },
  { id:8,  name:"SDM Medical College Hospital",    address:"Sattur Colony, Dharwad",             lat:15.360, lon:75.115, distance:0.9,  phone:"+91 836 221 0017", isOpen:true,  emergency:true,  is24x7:true,  specializations:["General Medicine","Surgery","Gynecology","Pediatrics","ENT","Ophthalmology"],           diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Ayushman Bharat","New India","United India"],                        rating:4.3, beds:800, image:img(2), established:1978, type:"teaching",         description:"SDM Medical College Hospital is one of Karnataka's oldest teaching hospitals offering subsidised high-quality medical care." },
  { id:9,  name:"District Government Hospital",    address:"Station Road, Hubli",                lat:15.355, lon:75.125, distance:1.0,  phone:"+91 836 236 8200", isOpen:true,  emergency:true,  is24x7:true,  specializations:["General Medicine","Surgery","Obstetrics","Pediatrics","Trauma"],                      diagnosticsAvailable:true,  pharmacyAvailable:false, insurance:["Ayushman Bharat","ESIC","CGHS"],                                     rating:3.9, beds:1500, image:img(3), established:1956, type:"government",       description:"The District Government Hospital serves as the primary healthcare provider for Hubli-Dharwad district with free care for BPL patients." },
  { id:10, name:"Vikram Hospital",                 address:"Lamington Road, Hubli",              lat:15.370, lon:75.145, distance:2.2,  phone:"+91 836 256 3000", isOpen:true,  emergency:false, is24x7:false, specializations:["Orthopedics","Sports Medicine","Joint Replacement","Spine Surgery"],                   diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","New India","Bajaj Allianz"],               rating:4.5, beds:200, image:img(4), established:2001, type:"specialty",        description:"Vikram Hospital is North Karnataka's premier orthopedic centre specialising in joint replacements and sports injuries." },
  { id:11, name:"BGS Gleneagles Hospital",         address:"Industrial Area, Dharwad",           lat:15.383, lon:75.151, distance:3.1,  phone:"+91 836 266 3000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Cardiology","Pulmonology","Gastroenterology","Endocrinology","Rheumatology"],            diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Bajaj Allianz","ICICI Lombard"],           rating:4.5, beds:320, image:img(0), established:2009, type:"multi-specialty", description:"BGS Gleneagles Global Hospital delivers specialist-led care with a focus on minimal-access and robotic procedures." },
  { id:12, name:"Sparsh Hospital",                 address:"Koppikar Road, Hubli",               lat:15.376, lon:75.128, distance:1.4,  phone:"+91 836 423 5000", isOpen:true,  emergency:true,  is24x7:false, specializations:["Neurology","Neurosurgery","Spine","Trauma","Rehabilitation"],                          diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Reliance","Bajaj Allianz"],                rating:4.6, beds:250, image:img(1), established:2007, type:"specialty",        description:"Sparsh Hospital is a centre of excellence for neurological care and trauma management in North Karnataka." },
  { id:13, name:"Aster CMI Hospital",              address:"NH 48, Bagalur Road, Hubli",         lat:15.348, lon:75.111, distance:2.0,  phone:"+91 836 240 1000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Cardiology","Oncology","Transplant","Gastroenterology","Urology"],                     diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Bajaj Allianz","ICICI Lombard","Cigna"],   rating:4.7, beds:430, image:img(2), established:2016, type:"multi-specialty", description:"Aster CMI Hospital is a NABH-accredited facility offering advanced surgical and medical care across 25 specialties." },
  { id:14, name:"NH Heart Institute Hubli",        address:"Gokul Road, Near Bus Stand, Hubli",  lat:15.340, lon:75.095, distance:4.5,  phone:"+91 836 244 0000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Cardiac Surgery","Interventional Cardiology","Electrophysiology"],                     diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","Ayushman Bharat","HDFC ERGO","ICICI Lombard"],         rating:4.8, beds:180, image:img(3), established:2011, type:"specialty",        description:"NH Heart Institute performs over 3000 cardiac surgeries a year with outcomes matching the best in the world." },
  { id:15, name:"Cloudnine Hospital",              address:"CBT Circle, Hubli",                  lat:15.368, lon:75.133, distance:1.2,  phone:"+91 836 288 0000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Obstetrics","Gynecology","Neonatology","Pediatrics","Fertility"],                      diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Bajaj Allianz","New India"],               rating:4.8, beds:120, image:img(4), established:2015, type:"maternity",        description:"Cloudnine Hospital is India's leading chain for maternity and women's health, known for superior neonatal care." },
  { id:16, name:"Sakra World Hospital",            address:"NH 206 Bypass, Dharwad",             lat:15.385, lon:75.155, distance:3.5,  phone:"+91 836 499 9999", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Cardiology","Neurology","Orthopedics","Gastroenterology","Transplant"],                  diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Bajaj Allianz","Aditya Birla","Religare"], rating:4.6, beds:380, image:img(0), established:2013, type:"multi-specialty", description:"Sakra World Hospital is a Joint Commission International (JCI) accredited facility offering super-specialty care." },
  { id:17, name:"HCG Cancer Centre",               address:"PB Road, Hubli",                     lat:15.343, lon:75.108, distance:2.5,  phone:"+91 836 422 0000", isOpen:true,  emergency:false, is24x7:false, specializations:["Oncology","Radiation Therapy","Surgical Oncology","Bone Marrow Transplant"],            diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Bajaj Allianz","ICICI Lombard"],           rating:4.7, beds:160, image:img(1), established:2009, type:"specialty",        description:"HCG Cancer Centre is India's largest cancer care network offering comprehensive oncology services with advanced technology." },
  { id:18, name:"Hubballi City Multicare Hospital",address:"Akashwani Circle, Hubli",            lat:15.356, lon:75.121, distance:0.9,  phone:"+91 836 225 1234", isOpen:true,  emergency:true,  is24x7:true,  specializations:["General Medicine","Surgery","Dermatology","ENT","Ophthalmology"],                      diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","New India","United India"],                            rating:4.2, beds:150, image:img(2), established:1995, type:"multi-specialty", description:"Hubballi City Multicare Hospital has served the city for 28 years providing affordable quality healthcare." },
  { id:19, name:"Janata District Hospital",        address:"Keshwapur, Hubli",                   lat:15.361, lon:75.130, distance:0.7,  phone:"+91 836 238 9000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["General Medicine","Emergency","Trauma","Obstetrics"],                                  diagnosticsAvailable:true,  pharmacyAvailable:false, insurance:["Ayushman Bharat","CGHS","ESIC"],                                     rating:3.7, beds:600, image:img(3), established:1962, type:"government",       description:"Janata District Hospital is a government tertiary care facility providing free treatment to underprivileged patients." },
  { id:20, name:"Rainbow Children's Hospital",     address:"Deshpande Nagar, Hubli",             lat:15.375, lon:75.120, distance:1.3,  phone:"+91 836 222 5000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Pediatrics","Neonatology","Pediatric Surgery","Child Neurology"],                        diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Bajaj Allianz","New India"],               rating:4.7, beds:200, image:img(4), established:2006, type:"specialty",        description:"Rainbow Children's Hospital is India's leading paediatric chain offering comprehensive child healthcare under one roof." },
  { id:21, name:"Sankara Eye Centre",              address:"Unkal Cross, Hubli",                 lat:15.368, lon:75.115, distance:1.0,  phone:"+91 836 421 6000", isOpen:true,  emergency:false, is24x7:false, specializations:["Ophthalmology","Cornea","Glaucoma","Retina","Paediatric Ophthalmology"],                diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","New India","United India"],                rating:4.8, beds:100, image:img(0), established:2000, type:"specialty",        description:"Sankara Eye Centre provides affordable world-class eye care performing over 50,000 surgeries annually across Karnataka." },
  { id:22, name:"Uro-Care Kidney Hospital",        address:"Gokul Road, Hubli",                  lat:15.388, lon:75.140, distance:3.0,  phone:"+91 836 233 8000", isOpen:true,  emergency:true,  is24x7:false, specializations:["Nephrology","Urology","Dialysis","Kidney Transplant"],                                 diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Bajaj Allianz"],                           rating:4.5, beds:130, image:img(1), established:2004, type:"specialty",        description:"Uro-Care Kidney Hospital is a dedicated renal care centre providing dialysis, transplant and advanced urology services." },
  { id:23, name:"Motherhood Women's Hospital",     address:"Club Road, Hubli",                   lat:15.352, lon:75.132, distance:1.5,  phone:"+91 836 244 9000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Obstetrics","Gynecology","Fertility IVF","Neonatology"],                               diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Bajaj Allianz","Religare"],                rating:4.6, beds:140, image:img(2), established:2012, type:"maternity",        description:"Motherhood Women's Hospital is a premium chain for maternity, gynaecology and fertility treatment." },
  { id:24, name:"Metro Multispecialty Hospital",   address:"Dharwad Bypass, Hubli",              lat:15.394, lon:75.165, distance:5.0,  phone:"+91 836 351 0000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Cardiology","Neurology","Orthopedics","Gastroenterology","Pulmonology"],                  diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","Bajaj Allianz","ICICI Lombard"],           rating:4.4, beds:280, image:img(3), established:2011, type:"multi-specialty", description:"Metro Multispecialty Hospital provides specialist care across 15 departments with modern diagnostic facilities." },
  { id:25, name:"City Care Clinic & Hospital",     address:"Ashok Nagar, Hubli",                 lat:15.364, lon:75.126, distance:0.4,  phone:"+91 836 220 5678", isOpen:true,  emergency:false, is24x7:false, specializations:["General Medicine","Dermatology","Psychiatry","Physiotherapy"],                         diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","New India"],                                           rating:4.1, beds:60,  image:img(4), established:1999, type:"clinic",           description:"City Care Clinic is a trusted neighbourhood healthcare provider with experienced general practitioners and specialists." },
  { id:26, name:"Hindu Mission Hospital",          address:"Dharwad Road, Hubli",                lat:15.345, lon:75.100, distance:3.3,  phone:"+91 836 260 4000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Surgery","Internal Medicine","Orthopedics","ENT","Ophthalmology"],                       diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","New India","United India","Ayushman Bharat"],          rating:4.3, beds:250, image:img(0), established:1968, type:"multi-specialty", description:"Hindu Mission Hospital has served the community for over 50 years providing compassionate, affordable healthcare." },
  { id:27, name:"Lifeline Hospital",               address:"Vidyanagar Circle, Hubli",           lat:15.378, lon:75.145, distance:2.8,  phone:"+91 836 256 7000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["Cardiology","Orthopedics","Gastroenterology","Dermatology"],                            diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","HDFC ERGO","New India"],                               rating:4.3, beds:180, image:img(1), established:2003, type:"multi-specialty", description:"Lifeline Hospital delivers reliable multi-specialty care with a patient-first approach and experienced clinical teams." },
  { id:28, name:"Comfort Care Super Speciality",   address:"Deshpande Nagar, Hubli",             lat:15.360, lon:75.127, distance:0.3,  phone:"+91 836 221 9000", isOpen:false, emergency:false, is24x7:false, specializations:["General Medicine","Physiotherapy","Nutrition","Wellness"],                             diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Star Health","New India"],                                           rating:4.0, beds:40,  image:img(2), established:2008, type:"clinic",           description:"Comfort Care Super Speciality focuses on holistic wellness, rehabilitation and chronic disease management." },
  { id:29, name:"Mallika Pulmonary Centre",        address:"Station Road, Hubli",                lat:15.371, lon:75.136, distance:1.7,  phone:"+91 836 231 1111", isOpen:true,  emergency:false, is24x7:false, specializations:["Pulmonology","Allergy","Sleep Medicine","Critical Care"],                              diagnosticsAvailable:true,  pharmacyAvailable:false, insurance:["Star Health","HDFC ERGO","New India"],                               rating:4.4, beds:90,  image:img(3), established:2002, type:"specialty",        description:"Mallika Pulmonary Centre is North Karnataka's dedicated respiratory care hospital with a specialised ICU and sleep lab." },
  { id:30, name:"AIIMS Dharwad",                   address:"Sattur Colony, Dharwad",             lat:15.338, lon:75.087, distance:5.5,  phone:"+91 836 299 0000", isOpen:true,  emergency:true,  is24x7:true,  specializations:["All Specialties","Research","Medical Education","Rare Diseases"],                      diagnosticsAvailable:true,  pharmacyAvailable:true,  insurance:["Ayushman Bharat","CGHS","ESIC","All TPA"],                           rating:4.9, beds:800, image:img(4), established:2019, type:"government",       description:"AIIMS Dharwad is India's premier government medical institute delivering free, world-class tertiary care to Karnataka." },
];

/* ─── Doctor Generation (100 doctors) ─── */
const maleFN = ['Rajesh','Suresh','Anil','Venkatesh','Prakash','Srinivas','Mohan','Kiran','Deepak','Mahesh','Ravi','Ramesh','Ganesh','Naresh','Dinesh','Umesh','Yogesh','Hitesh','Ramakrishna','Shivakumar','Vikram','Arjun','Naveen','Santosh','Pradeep'];
const femaleFN = ['Priya','Kavitha','Sunita','Meena','Anitha','Lakshmi','Rekha','Padma','Shobha','Usha','Vijaya','Leela','Savitha','Geeta','Suma','Nirmala','Radha','Hema','Jyothi','Vani'];
const lastNames = ['Kumar','Patel','Sharma','Rao','Hegde','Murthy','Reddy','Singh','Nair','Desai','Krishnan','Bhat','Gowda','Kulkarni','Patil','Joshi','Naik','Verma','Gupta','Mehta','Shetty','Kamath','Shenoy','Iyer','Pillai'];
const quals = ['MBBS, MD','MBBS, MS','MBBS, DM','MBBS, MCh','MBBS, DNB','MD, DM','MS, MCh','MBBS, PhD','MBBS, FRCS','MD, MRCP'];
const specs = ['Cardiology','Orthopedics','Neurology','Dermatology','Psychiatry','Pediatrics','ENT','General Medicine','Oncology','Gastroenterology','Urology','Nephrology','Pulmonology','Endocrinology','Rheumatology','Ophthalmology','Obstetrics & Gynecology','Radiology','Anesthesiology','Dentistry'];
const langGroups = [['Kannada','Hindi','English'],['Telugu','English'],['Tamil','English','Hindi'],['Marathi','Hindi','English'],['English','Hindi'],['Kannada','English'],['Hindi','English'],['Kannada','Telugu','English']];
const fees = [300,400,500,600,700,800,1000,1200];

export const DOCTORS: DoctorFull[] = Array.from({ length: 100 }, (_, i) => {
  const gender: 'male' | 'female' = i % 3 === 2 ? 'female' : 'male';
  const fn = gender === 'male' ? maleFN[i % maleFN.length] : femaleFN[i % femaleFN.length];
  const ln = lastNames[i % lastNames.length];
  const hospitalIdx = i % 30;
  return {
    id: i + 1,
    name: `Dr. ${fn} ${ln}`,
    photo: `https://randomuser.me/api/portraits/${gender === 'male' ? 'men' : 'women'}/${(i % 70) + 1}.jpg`,
    qualification: quals[i % quals.length],
    specialization: specs[i % specs.length],
    experience: (i % 28) + 3,
    languages: langGroups[i % langGroups.length],
    hospital: HOSPITALS[hospitalIdx].name,
    hospitalId: hospitalIdx + 1,
    phone: `+91 98${String(6000000 + i).padStart(8,'0')}`,
    rating: Number((3.6 + (i % 13) * 0.1).toFixed(1)),
    consultationFee: fees[i % fees.length],
    available: i % 5 !== 0,
    gender,
  };
});

/* ─── Lab Generation (50 labs) ─── */
const labNames = ['Thyrocare','SRL Diagnostics','Dr. Lal PathLabs','Metropolis','Apollo Diagnostics','Healthians','Orange Health Labs','NABL Diagnostics','Vijaya Diagnostics','Strand Life Sciences','Medall Diagnostics','Neuberg Diagnostics','Suburban Diagnostics','Agilus Diagnostics','MedGenome Labs'];
const labTests = [
  ['CBC','LFT','KFT','Lipid Profile','HbA1c'],
  ['MRI Brain','CT Chest','X-Ray','Ultrasound','DEXA Scan'],
  ['Blood Sugar','Thyroid Panel','Vitamin D','B12','Iron Studies'],
  ['Full Body Checkup','Fever Panel','Dengue','COVID RT-PCR','Malaria'],
  ['ECG','2D Echo','Holter Monitor','Treadmill Test'],
  ['Pap Smear','Mammography','Bone Density','Hormonal Panel'],
  ['Allergy Panel','ANA Profile','RA Factor','CRP','ESR'],
  ['Culture & Sensitivity','HIV','Hepatitis B','VDRL','HCV'],
];
const labTimings = ['6:00 AM – 8:00 PM','7:00 AM – 9:00 PM','24 Hours','6:30 AM – 7:30 PM','8:00 AM – 6:00 PM'];
const labAddresses = ['Vidyanagar, Hubli','Keshwapur, Hubli','Deshpande Nagar, Hubli','Koppikar Road, Hubli','CBT Circle, Hubli','Gokul Road, Hubli','Akashwani Circle, Hubli','Station Road, Hubli','Club Road, Hubli','Ashok Nagar, Hubli'];

export const LABS: LabCenter[] = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: `${labNames[i % labNames.length]}${i >= labNames.length ? ` - Branch ${Math.floor(i / labNames.length) + 1}` : ''}`,
  address: labAddresses[i % labAddresses.length],
  distance: Number((0.3 + (i % 12) * 0.5).toFixed(1)),
  timings: labTimings[i % labTimings.length],
  phone: `+91 97${String(8000000 + i).padStart(8,'0')}`,
  homeCollection: i % 3 !== 2,
  tests: labTests[i % labTests.length],
  rating: Number((3.8 + (i % 10) * 0.1).toFixed(1)),
  isOpen: i % 7 !== 5,
  startingPrice: [199,299,399,499,149,249,349][i % 7],
  lat: 15.3647 + Math.sin(i * 0.8) * 0.07,
  lon: 75.124 + Math.cos(i * 0.8) * 0.07,
}));

/* ─── Pharmacy Generation (50 pharmacies) ─── */
const pharmNames = ['MedPlus','Apollo Pharmacy','Wellness Forever','Netmeds Store','Jan Aushadhi Kendra','Green Cross Pharmacy','CareFirst Pharmacy','HealthMart','PharmEasy Store','Dava India','True Care Pharmacy','Medkart','Rx Health Pharmacy','Noble Chemist','Life Care Medical'];
const pharmAddresses = ['Koppikar Road, Hubli','Lamington Road, Hubli','Vidyanagar, Hubli','PB Road, Hubli','Gokul Road, Hubli','CBT Road, Hubli','Deshpande Nagar, Hubli','Ashok Nagar, Hubli','Club Road, Hubli','Station Road, Hubli'];

export const PHARMACIES: PharmacyStore[] = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: `${pharmNames[i % pharmNames.length]}${i >= pharmNames.length ? ` - ${pharmAddresses[Math.floor(i / pharmNames.length) % pharmAddresses.length].split(',')[0]}` : ''}`,
  address: pharmAddresses[i % pharmAddresses.length],
  distance: Number((0.2 + (i % 10) * 0.4).toFixed(1)),
  isOpen: i % 6 !== 4,
  delivery: i % 4 !== 3,
  phone: `+91 96${String(7000000 + i).padStart(8,'0')}`,
  rating: Number((3.7 + (i % 12) * 0.1).toFixed(1)),
  is24x7: i % 5 === 0,
  lat: 15.3647 + Math.sin(i * 0.9 + 2) * 0.06,
  lon: 75.124 + Math.cos(i * 0.9 + 2) * 0.06,
}));

/* ─── Health Packages (10) ─── */
export const PACKAGES: HealthPackage[] = [
  { id:1,  name:"Aarogya Full Body Checkup",     provider:"Apollo Hospital",     price:1499, originalPrice:2999, tests:["CBC","LFT","KFT","Lipid Profile","Blood Sugar","Thyroid","Urine R/E","Chest X-Ray","ECG","HbA1c","Vitamin D","B12","Calcium","Iron Studies","Stool Analysis"], category:"Full Body",  description:"India's most comprehensive health checkup covering 85+ parameters to assess your overall health.",   testsCount:85,  homeCollection:true },
  { id:2,  name:"Diabetes Care Package",         provider:"Dr. Lal PathLabs",    price:899,  originalPrice:1799, tests:["HbA1c","Fasting Blood Sugar","PPBS","Insulin Fasting","Lipid Profile","Kidney Function","Urine Microalbumin","Urine R/E"], category:"Diabetes",   description:"Comprehensive diabetes monitoring panel to assess glycaemic control and prevent complications.", testsCount:40,  homeCollection:true },
  { id:3,  name:"Heart Guard Screening",         provider:"Narayana Health",     price:1999, originalPrice:3999, tests:["2D Echo","ECG","TMT","Troponin","BNP","Lipid Profile","hs-CRP","Homocysteine","Chest X-Ray","Cardiologist Consultation"], category:"Cardiac",    description:"Complete cardiac risk assessment with expert cardiologist review and advanced biomarker tests.", testsCount:50,  homeCollection:false },
  { id:4,  name:"Liver Health Package",          provider:"SRL Diagnostics",     price:799,  originalPrice:1599, tests:["LFT","GGT","Hepatitis B Antigen","HCV Antibody","AFP","Ultrasound Abdomen","PT/INR"], category:"Liver",      description:"Comprehensive liver function assessment to detect fatty liver, hepatitis and cirrhosis early.",    testsCount:35,  homeCollection:true },
  { id:5,  name:"Senior Citizen Wellness",       provider:"Metropolis",          price:2499, originalPrice:4999, tests:["Full Body Checkup","Bone Density","Vision Test","Hearing Test","Prostate/Gynae","Memory Screen","Cardiology Consult","Ophthalmology","ECG","Dental Checkup"], category:"Senior",     description:"Specially designed for 60+ with 100+ parameters covering all age-related health concerns.",         testsCount:100, homeCollection:true },
  { id:6,  name:"Women's Wellness Package",      provider:"Cloudnine Hospital",  price:1299, originalPrice:2499, tests:["CBC","Hormonal Panel","Thyroid","Pap Smear","Mammography","Bone Density","Iron","Vitamin D","Pelvic Ultrasound","Gynae Consultation"], category:"Women",      description:"Complete women's health screening package from reproductive health to bone and thyroid assessment.", testsCount:60,  homeCollection:false },
  { id:7,  name:"Thyroid & Hormonal Panel",      provider:"Thyrocare",           price:599,  originalPrice:1199, tests:["TSH","Free T3","Free T4","Anti-TPO","Anti-TG","Prolactin","FSH","LH","Cortisol","Testosterone"], category:"Hormonal",   description:"Detailed thyroid and hormonal panel for both men and women to assess glandular health.",             testsCount:25,  homeCollection:true },
  { id:8,  name:"Cancer Screening Package",      provider:"HCG Cancer Centre",   price:3499, originalPrice:6999, tests:["PSA (Men)","CA-125 (Women)","CEA","CA 19-9","AFP","Beta HCG","LDHA","CBC","Tumour Markers Panel","Consultation"], category:"Cancer",     description:"Early cancer detection screening with comprehensive tumour markers and specialist consultation.",    testsCount:30,  homeCollection:false },
  { id:9,  name:"Kidney Care Package",           provider:"Uro-Care Hospital",   price:999,  originalPrice:1999, tests:["KFT","Urine R/E","Urine Culture","eGFR","Creatinine","BUN","Uric Acid","24hr Urine Protein","Kidney Ultrasound"], category:"Kidney",     description:"Full renal function assessment to detect kidney disease early and monitor existing conditions.",     testsCount:40,  homeCollection:true },
  { id:10, name:"Vitamin & Nutrition Panel",     provider:"Healthians",          price:499,  originalPrice:999,  tests:["Vitamin D","Vitamin B12","Folate","Iron","Ferritin","Zinc","Magnesium","Calcium","Phosphorus"], category:"Nutrition",  description:"Find nutritional deficiencies that cause fatigue, weakness, and poor immunity with this panel.",    testsCount:20,  homeCollection:true },
];
