/**
 * Sites d'offres publics collectés dans le Supabase métier de ce projet.
 * LinkedIn, Indeed, Glassdoor et ZipRecruiter ne sont pas scrapés :
 * ils passent par JSearch. Africawork est une page publique ; l'API
 * n'est appelée que si AFRICAWORK_API_URL est défini côté serveur.
 */
export interface JobSiteSource {
  id: string;
  nom: string;
  pays: string;
  listingUrl: string;
  parser: 'minajobs' | 'links';
}

export const JOB_SITE_SOURCES: JobSiteSource[] = [
  { id: 'doopinet', nom: 'DooJobs', pays: 'Cameroun', listingUrl: 'https://jobs.doopinet.com/', parser: 'links' },
  { id: 'emploi-cm', nom: 'Emploi.cm', pays: 'Cameroun', listingUrl: 'https://www.emploi.cm/', parser: 'links' },
  { id: 'jobinfocamer', nom: 'JobInfoCamer', pays: 'Cameroun', listingUrl: 'https://www.jobinfocamer.com/', parser: 'links' },
  { id: 'cameroundesk', nom: 'CameroonDesk', pays: 'Cameroun', listingUrl: 'https://www.cameroundesk.com/', parser: 'links' },
  { id: 'minajobs', nom: 'MinaJobs', pays: 'Cameroun', listingUrl: 'https://www.minajobs.net/offres-emplois-stages', parser: 'minajobs' },
  { id: 'africawork', nom: 'Africawork', pays: 'Afrique', listingUrl: 'https://www.africawork.com/recruitment-agency/africa/job-vacancies', parser: 'links' },
  { id: 'emploidakar', nom: 'EmploiDakar', pays: 'Sénégal', listingUrl: 'https://www.emploidakar.com/', parser: 'links' },
  { id: 'senjob', nom: 'SenJob', pays: 'Sénégal', listingUrl: 'https://www.senjob.com/', parser: 'links' },
  { id: 'emploi-sn', nom: 'Emploi.sn', pays: 'Sénégal', listingUrl: 'https://www.emploi.sn/', parser: 'links' },
  { id: 'emploi-ci', nom: 'Emploi.ci', pays: "Côte d'Ivoire", listingUrl: 'https://www.emploi.ci/', parser: 'links' },
  { id: 'novojob-ci', nom: 'Novojob', pays: "Côte d'Ivoire", listingUrl: 'https://www.novojob.ci/', parser: 'links' },
  { id: 'malijob', nom: 'MaliJob', pays: 'Mali', listingUrl: 'https://www.malijob.net/', parser: 'links' },
  { id: 'emploi-ml', nom: 'Emploi.ml', pays: 'Mali', listingUrl: 'https://www.emploi.ml/', parser: 'links' },
  { id: 'burkinaemploi', nom: 'BurkinaEmploi', pays: 'Burkina Faso', listingUrl: 'https://www.burkinaemploi.net/', parser: 'links' },
  { id: 'emploi-bf', nom: 'Emploi.bf', pays: 'Burkina Faso', listingUrl: 'https://www.emploi.bf/', parser: 'links' },
  { id: 'emploi-bj', nom: 'Emploi.bj', pays: 'Bénin', listingUrl: 'https://www.emploi.bj/', parser: 'links' },
  { id: 'jobbenin', nom: 'JobBenin', pays: 'Bénin', listingUrl: 'https://www.jobbenin.com/', parser: 'links' },
  { id: 'emploitogo', nom: 'EmploiTogo', pays: 'Togo', listingUrl: 'https://www.emploitogo.info/', parser: 'links' },
  { id: 'emploiguinee', nom: 'EmploiGuinee', pays: 'Guinée', listingUrl: 'https://www.emploiguinee.com/', parser: 'links' },
  { id: 'jobguinee', nom: 'JobGuinee', pays: 'Guinée', listingUrl: 'https://www.jobguinee.com/', parser: 'links' },
  { id: 'nigeremploi', nom: 'NigerEmploi', pays: 'Niger', listingUrl: 'https://www.nigeremploi.net/', parser: 'links' },
  { id: 'anpe-ne', nom: 'ANPE Niger', pays: 'Niger', listingUrl: 'https://www.anpe.ne/', parser: 'links' },
  { id: 'emploi-cd', nom: 'Emploi.cd', pays: 'RDC', listingUrl: 'https://www.emploi.cd/', parser: 'links' },
  { id: 'jobrdc', nom: 'JobRDC', pays: 'RDC', listingUrl: 'https://www.jobrdc.com/', parser: 'links' },
  { id: 'mediacongo', nom: 'Mediacongo Emploi', pays: 'RDC', listingUrl: 'https://www.mediacongo.net/', parser: 'links' },
  { id: 'emploi-cg', nom: 'Emploi.cg', pays: 'Congo', listingUrl: 'https://www.emploi.cg/', parser: 'links' },
  { id: 'emploi-ga', nom: 'Emploi.ga', pays: 'Gabon', listingUrl: 'https://www.emploi.ga/', parser: 'links' },
  { id: 'jobgabon', nom: 'JobGabon', pays: 'Gabon', listingUrl: 'https://www.jobgabon.com/', parser: 'links' },
  { id: 'tchadcarriere', nom: 'TchadCarriere', pays: 'Tchad', listingUrl: 'https://www.tchadcarriere.com/', parser: 'links' },
];
