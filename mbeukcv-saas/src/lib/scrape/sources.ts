export interface ListingSource {
  id: string;
  name: string;
  listingUrl: string;
  location: string;
}

export const LISTING_SOURCES: ListingSource[] = [
  { id: 'doopinet', name: 'DooJobs', listingUrl: 'https://jobs.doopinet.com/', location: 'Cameroun' },
  { id: 'emploi.cm', name: 'Emploi.cm', listingUrl: 'https://www.emploi.cm/', location: 'Cameroun' },
  { id: 'jobinfocamer', name: 'JobInfoCamer', listingUrl: 'https://www.jobinfocamer.com/', location: 'Cameroun' },
  { id: 'cameroundesk', name: 'CameroonDesk', listingUrl: 'https://www.cameroundesk.com/', location: 'Cameroun' },
  { id: 'minajobs', name: 'MinaJobs', listingUrl: 'https://www.minajobs.net/offres-emplois-stages', location: 'Cameroun' },
  { id: 'africawork', name: 'Africawork', listingUrl: 'https://www.africawork.com/recruitment-agency/africa/job-vacancies', location: 'Afrique' },
  { id: 'emploidakar', name: 'EmploiDakar', listingUrl: 'https://www.emploidakar.com/', location: 'Sénégal' },
  { id: 'senjob', name: 'SenJob', listingUrl: 'https://www.senjob.com/', location: 'Sénégal' },
  { id: 'emploi-sn', name: 'Emploi.sn', listingUrl: 'https://www.emploi.sn/', location: 'Sénégal' },
  { id: 'emploi-ci', name: 'Emploi.ci', listingUrl: 'https://www.emploi.ci/', location: "Côte d'Ivoire" },
  { id: 'novojob-ci', name: 'Novojob', listingUrl: 'https://www.novojob.ci/', location: "Côte d'Ivoire" },
  { id: 'malijob', name: 'MaliJob', listingUrl: 'https://www.malijob.net/', location: 'Mali' },
  { id: 'emploi-ml', name: 'Emploi.ml', listingUrl: 'https://www.emploi.ml/', location: 'Mali' },
  { id: 'burkinaemploi', name: 'BurkinaEmploi', listingUrl: 'https://www.burkinaemploi.net/', location: 'Burkina Faso' },
  { id: 'emploi-bf', name: 'Emploi.bf', listingUrl: 'https://www.emploi.bf/', location: 'Burkina Faso' },
  { id: 'emploi-bj', name: 'Emploi.bj', listingUrl: 'https://www.emploi.bj/', location: 'Bénin' },
  { id: 'jobbenin', name: 'JobBenin', listingUrl: 'https://www.jobbenin.com/', location: 'Bénin' },
  { id: 'emploitogo', name: 'EmploiTogo', listingUrl: 'https://www.emploitogo.info/', location: 'Togo' },
  { id: 'emploiguinee', name: 'EmploiGuinee', listingUrl: 'https://www.emploiguinee.com/', location: 'Guinée' },
  { id: 'jobguinee', name: 'JobGuinee', listingUrl: 'https://www.jobguinee.com/', location: 'Guinée' },
  { id: 'nigeremploi', name: 'NigerEmploi', listingUrl: 'https://www.nigeremploi.net/', location: 'Niger' },
  { id: 'anpe-ne', name: 'ANPE Niger', listingUrl: 'https://www.anpe.ne/', location: 'Niger' },
  { id: 'emploi-cd', name: 'Emploi.cd', listingUrl: 'https://www.emploi.cd/', location: 'RDC' },
  { id: 'jobrdc', name: 'JobRDC', listingUrl: 'https://www.jobrdc.com/', location: 'RDC' },
  { id: 'mediacongo', name: 'Mediacongo Emploi', listingUrl: 'https://www.mediacongo.net/', location: 'RDC' },
  { id: 'emploi-cg', name: 'Emploi.cg', listingUrl: 'https://www.emploi.cg/', location: 'Congo' },
  { id: 'emploi-ga', name: 'Emploi.ga', listingUrl: 'https://www.emploi.ga/', location: 'Gabon' },
  { id: 'jobgabon', name: 'JobGabon', listingUrl: 'https://www.jobgabon.com/', location: 'Gabon' },
  { id: 'tchadcarriere', name: 'TchadCarriere', listingUrl: 'https://www.tchadcarriere.com/', location: 'Tchad' },
];
