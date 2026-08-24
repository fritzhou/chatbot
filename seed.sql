-- =========================================================
-- Seed data: Lourdes College, Inc. (Cagayan de Oro City)
-- Content paraphrased from the official website, lccdo.edu.ph,
-- as of August 2026. Tuition figures are intentionally NOT
-- included since the school does not publish them online —
-- the FAQ instead directs students to the Admissions/Cashier
-- office, rather than guessing a number.
--
-- Every FAQ below exists in three languages (en / fil / ceb)
-- as three separate rows, matching the language column model
-- used by the chatbot. Safe to re-run: uses ON CONFLICT DO
-- NOTHING throughout.
-- Run this AFTER the 001-004 migrations.
-- =========================================================

insert into public.categories (name, description) values
  ('Enrollment', 'Enrollment periods, requirements, and procedures'),
  ('Tuition & Fees', 'Payment schedules, fee breakdowns, and refunds'),
  ('Registrar', 'Records, transcripts, and document requests'),
  ('Scholarships', 'Financial aid and scholarship programs'),
  ('Admissions', 'Application requirements and deadlines'),
  ('Student Services', 'Guidance, health, and support services'),
  ('Campus Facilities', 'Buildings, library, labs, and amenities'),
  ('Contact Information', 'Office hours, phone numbers, and locations')
on conflict (name) do nothing;

-- =========================================================
-- 1. Campus locations  →  Campus Facilities
-- =========================================================

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Where is Lourdes College located?',
  'Lourdes College has two campuses in Cagayan de Oro City: the Higher Education campus on Gen. Capistrano Street, and the K to 10 (Integrated Basic Education) campus on 14th Street, Barangay Macasandig.',
  (select id from public.categories where name = 'Campus Facilities' limit 1),
  'en', 2, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/contact-us/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Saan matatagpuan ang Lourdes College?',
  'May dalawang kampus ang Lourdes College sa Lungsod ng Cagayan de Oro: ang Higher Education campus sa Gen. Capistrano Street, at ang K to 10 (Integrated Basic Education) campus sa 14th Street, Barangay Macasandig.',
  (select id from public.categories where name = 'Campus Facilities' limit 1),
  'fil', 2, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/contact-us/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Asa nahimutang ang Lourdes College?',
  'Ang Lourdes College adunay duha ka kampus sa Dakbayan sa Cagayan de Oro: ang Higher Education campus nga naa sa Gen. Capistrano Street, ug ang K to 10 (Integrated Basic Education) campus nga naa sa 14th Street, Barangay Macasandig.',
  (select id from public.categories where name = 'Campus Facilities' limit 1),
  'ceb', 2, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/contact-us/'
) on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('location',3),('campus',3),('address',2),('capistrano',2),('macasandig',2)) as k(kw,w)
where question = 'Where is Lourdes College located?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('saan',3),('lokasyon',3),('kampus',3),('address',2)) as k(kw,w)
where question = 'Saan matatagpuan ang Lourdes College?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('asa',3),('kampus',3),('address',2),('nahimutang',2)) as k(kw,w)
where question = 'Asa nahimutang ang Lourdes College?' on conflict do nothing;

-- =========================================================
-- 2. Office hours & contact  →  Contact Information
-- =========================================================

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'What are Lourdes College''s office hours and how can I contact the school?',
  'The main offices are open Monday to Friday, 8:00 AM to 5:00 PM, and Saturday, 8:00 AM to 12:00 NN. You can reach the school at +63 (977) 108 7317 or through the official Lourdes College Facebook page.',
  (select id from public.categories where name = 'Contact Information' limit 1),
  'en', 2, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/contact-us/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Ano ang oras ng opisina ng Lourdes College at paano ko sila makokontak?',
  'Bukas ang mga opisina tuwing Lunes hanggang Biyernes, 8:00 AM hanggang 5:00 PM, at Sabado, 8:00 AM hanggang 12:00 NN. Maaari kang tumawag sa +63 (977) 108 7317 o bisitahin ang opisyal na Facebook page ng Lourdes College.',
  (select id from public.categories where name = 'Contact Information' limit 1),
  'fil', 2, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/contact-us/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Unsa ang oras sa opisina sa Lourdes College ug unsaon nako pagkontak?',
  'Ang mga opisina bukas Lunes hangtod Biyernes, 8:00 AM hangtod 5:00 PM, ug Sabado, 8:00 AM hangtod 12:00 NN. Pwede mo tawagan ang +63 (977) 108 7317 o bisitahon ang opisyal nga Facebook page sa Lourdes College.',
  (select id from public.categories where name = 'Contact Information' limit 1),
  'ceb', 2, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/contact-us/'
) on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('office hours',3),('contact',3),('phone',2),('schedule',2)) as k(kw,w)
where question = 'What are Lourdes College''s office hours and how can I contact the school?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('oras',3),('opisina',3),('telepono',2),('kontak',2)) as k(kw,w)
where question = 'Ano ang oras ng opisina ng Lourdes College at paano ko sila makokontak?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('oras',3),('opisina',3),('telepono',2),('kontak',2)) as k(kw,w)
where question = 'Unsa ang oras sa opisina sa Lourdes College ug unsaon nako pagkontak?' on conflict do nothing;

-- =========================================================
-- 3. Enrollment  →  Enrollment
-- =========================================================

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'How do I enroll at Lourdes College?',
  'Enrollment is done online through the school''s official enrollment portal at enroll.lccdo.edu.ph. New and returning students can also inquire in person at the Admissions/Registrar''s Office on the main campus for guidance on requirements and the enrollment schedule for the current school year.',
  (select id from public.categories where name = 'Enrollment' limit 1),
  'en', 3, 'active', 'Lourdes College Official Website', 'https://enroll.lccdo.edu.ph/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Paano ako mag-e-enroll sa Lourdes College?',
  'Ginagawa online ang pag-enroll sa pamamagitan ng opisyal na enrollment portal ng paaralan sa enroll.lccdo.edu.ph. Ang mga bago at dating estudyante ay maaari ring magtanong nang personal sa Admissions/Registrar''s Office sa main campus para sa gabay tungkol sa mga requirements at iskedyul ng enrollment para sa kasalukuyang taon.',
  (select id from public.categories where name = 'Enrollment' limit 1),
  'fil', 3, 'active', 'Lourdes College Official Website', 'https://enroll.lccdo.edu.ph/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Unsaon nako pag-enroll sa Lourdes College?',
  'Ang pag-enroll gihimo online pinaagi sa opisyal nga enrollment portal sa eskwelahan diha sa enroll.lccdo.edu.ph. Ang bag-o ug daan nga mga estudyante pwede usab mangutana personal sa Admissions/Registrar''s Office sa main campus alang sa giya bahin sa mga requirements ug iskedyul sa enrollment para sa karon nga school year.',
  (select id from public.categories where name = 'Enrollment' limit 1),
  'ceb', 3, 'active', 'Lourdes College Official Website', 'https://enroll.lccdo.edu.ph/'
) on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('enroll',3),('enrollment',3),('register',2),('apply',2),('portal',2)) as k(kw,w)
where question = 'How do I enroll at Lourdes College?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('enroll',3),('pagpapatala',3),('requirements',2)) as k(kw,w)
where question = 'Paano ako mag-e-enroll sa Lourdes College?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('enroll',3),('pagpatala',3),('requirements',2)) as k(kw,w)
where question = 'Unsaon nako pag-enroll sa Lourdes College?' on conflict do nothing;

-- =========================================================
-- 4. Programs offered  →  Admissions
-- =========================================================

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'What programs or courses does Lourdes College offer?',
  'Lourdes College offers K to 10, Senior High School, Higher Education, and Graduate School programs. College degree programs include Accountancy, Information Technology, Nursing, Pharmacy, Psychology, Business Administration, Hospitality and Tourism Management, Social Work, Communication, English, Library and Information Science, Music, and several Teacher Education tracks.',
  (select id from public.categories where name = 'Admissions' limit 1),
  'en', 2, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/higher-education/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Anong mga programa o kurso ang inaalok ng Lourdes College?',
  'Nag-aalok ang Lourdes College ng K to 10, Senior High School, Higher Education, at Graduate School. Kabilang sa mga kursong college ang Accountancy, Information Technology, Nursing, Pharmacy, Psychology, Business Administration, Hospitality at Tourism Management, Social Work, Communication, English, Library and Information Science, Music, at iba''t ibang Teacher Education track.',
  (select id from public.categories where name = 'Admissions' limit 1),
  'fil', 2, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/higher-education/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Unsa nga mga programa o kurso ang gitanyag sa Lourdes College?',
  'Ang Lourdes College nagtanyag og K to 10, Senior High School, Higher Education, ug Graduate School. Lakip sa mga kurso sa kolehiyo ang Accountancy, Information Technology, Nursing, Pharmacy, Psychology, Business Administration, Hospitality ug Tourism Management, Social Work, Communication, English, Library and Information Science, Music, ug lain-laing Teacher Education tracks.',
  (select id from public.categories where name = 'Admissions' limit 1),
  'ceb', 2, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/higher-education/'
) on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('programs',3),('courses',3),('degree',2),('offer',2)) as k(kw,w)
where question = 'What programs or courses does Lourdes College offer?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('programa',3),('kurso',3),('alok',2)) as k(kw,w)
where question = 'Anong mga programa o kurso ang inaalok ng Lourdes College?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('programa',3),('kurso',3),('tanyag',2)) as k(kw,w)
where question = 'Unsa nga mga programa o kurso ang gitanyag sa Lourdes College?' on conflict do nothing;

-- =========================================================
-- 5. Accreditation  →  Admissions
-- =========================================================

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Is Lourdes College an accredited school?',
  'Yes. Lourdes College is accredited by the Philippine Accrediting Association of Schools, Colleges and Universities (PAASCU) and is also certified under ISO 21001:2018, an international standard for educational organization management systems.',
  (select id from public.categories where name = 'Admissions' limit 1),
  'en', 1, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/accreditations-and-certifications/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Akreditado ba ang Lourdes College?',
  'Oo. Akreditado ang Lourdes College ng Philippine Accrediting Association of Schools, Colleges and Universities (PAASCU) at sertipikado rin sa ilalim ng ISO 21001:2018, isang internasyonal na pamantayan para sa educational organization management systems.',
  (select id from public.categories where name = 'Admissions' limit 1),
  'fil', 1, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/accreditations-and-certifications/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Akreditado ba ang Lourdes College?',
  'Oo. Ang Lourdes College akreditado sa Philippine Accrediting Association of Schools, Colleges and Universities (PAASCU) ug sertipikado usab ubos sa ISO 21001:2018, usa ka internasyonal nga sumbanan alang sa educational organization management systems.',
  (select id from public.categories where name = 'Admissions' limit 1),
  'ceb', 1, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/accreditations-and-certifications/'
) on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select f.id, kw, w
from public.faqs f, (values ('accredited',3),('accreditation',3),('paascu',3),('iso',2)) as k(kw,w)
where f.question = 'Is Lourdes College an accredited school?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select f.id, kw, w
from public.faqs f, (values ('akreditado',3),('paascu',3)) as k(kw,w)
where f.question = 'Akreditado ba ang Lourdes College?' and f.language = 'fil' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select f.id, kw, w
from public.faqs f, (values ('akreditado',3),('paascu',3)) as k(kw,w)
where f.question = 'Akreditado ba ang Lourdes College?' and f.language = 'ceb' on conflict do nothing;

-- =========================================================
-- 6. Mission & vision  →  Student Services
-- =========================================================

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'What is the mission and vision of Lourdes College?',
  'Lourdes College''s vision is to nurture learners as humble, globally competent leaders grounded in solidarity and committed to the common good. Its mission centers on forming Ignacian Marian leaders who live out faith, excellence, and service, guided by the motto "The Fear of the Lord is the Beginning of Wisdom."',
  (select id from public.categories where name = 'Student Services' limit 1),
  'en', 1, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/about-the-school/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Ano ang misyon at bisyon ng Lourdes College?',
  'Ang bisyon ng Lourdes College ay ang pag-alaga sa mga mag-aaral bilang mapagpakumbabang, globally competent na mga lider na nakaugat sa pagkakaisa at nakatuon sa kapakanan ng lahat. Nakasentro ang misyon nito sa pagbuo ng mga Ignacian Marian leaders na nagpapamalas ng pananampalataya, kahusayan, at paglilingkod, ayon sa motto na "Ang Pagkatakot sa Panginoon ay ang Simula ng Karunungan."',
  (select id from public.categories where name = 'Student Services' limit 1),
  'fil', 1, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/about-the-school/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Unsa ang misyon ug bisyon sa Lourdes College?',
  'Ang bisyon sa Lourdes College mao ang pag-atiman sa mga estudyante isip mapainubsanon, globally competent nga mga lider nga nakagamot sa panaghiusa ug determinado sa kaayohan sa tanan. Ang misyon niini nakasentro sa pagporma og Ignacian Marian leaders nga nagpakita og pagtuo, kahanas, ug pag-alagad, subay sa motto nga "Ang Kahadlok sa Ginoo mao ang Sinugdanan sa Kaalam."',
  (select id from public.categories where name = 'Student Services' limit 1),
  'ceb', 1, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/about-the-school/'
) on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('mission',3),('vision',3),('values',2)) as k(kw,w)
where question = 'What is the mission and vision of Lourdes College?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('misyon',3),('bisyon',3)) as k(kw,w)
where question = 'Ano ang misyon at bisyon ng Lourdes College?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('misyon',3),('bisyon',3)) as k(kw,w)
where question = 'Unsa ang misyon ug bisyon sa Lourdes College?' on conflict do nothing;

-- =========================================================
-- 7. Scholarships  →  Scholarships
-- =========================================================

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Does Lourdes College offer scholarships or financial assistance?',
  'Lourdes College participates in external scholarship and grant programs, including the City Government of Cagayan de Oro''s Scholarship Program. For available in-house grants, discounts, and application requirements, students should inquire directly with the Scholarships or Student Financial Assistance office.',
  (select id from public.categories where name = 'Scholarships' limit 1),
  'en', 2, 'active', 'Lourdes College / City Government of Cagayan de Oro', 'https://www.cagayandeoro.gov.ph/index.php/news/the-city-hall/the-departments-and-offices/115-city-scholarships-office.html'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'May scholarship o tulong pinansyal ba ang Lourdes College?',
  'Kasama ang Lourdes College sa mga panlabas na scholarship at grant programs, kabilang ang Scholarship Program ng City Government ng Cagayan de Oro. Para sa mga available na in-house na grants, discount, at requirements sa aplikasyon, dapat direktang magtanong ang mga estudyante sa Scholarships o Student Financial Assistance office.',
  (select id from public.categories where name = 'Scholarships' limit 1),
  'fil', 2, 'active', 'Lourdes College / City Government of Cagayan de Oro', 'https://www.cagayandeoro.gov.ph/index.php/news/the-city-hall/the-departments-and-offices/115-city-scholarships-office.html'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Naa bay scholarship o tabang pinansyal ang Lourdes College?',
  'Ang Lourdes College kabahin sa mga eksternal nga scholarship ug grant programs, lakip ang Scholarship Program sa City Government sa Cagayan de Oro. Para sa mga naa nga in-house nga grants, discount, ug requirements sa aplikasyon, kinahanglan mangutana direkta ang mga estudyante sa Scholarships o Student Financial Assistance office.',
  (select id from public.categories where name = 'Scholarships' limit 1),
  'ceb', 2, 'active', 'Lourdes College / City Government of Cagayan de Oro', 'https://www.cagayandeoro.gov.ph/index.php/news/the-city-hall/the-departments-and-offices/115-city-scholarships-office.html'
) on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('scholarship',3),('financial aid',3),('grant',2),('discount',2)) as k(kw,w)
where question = 'Does Lourdes College offer scholarships or financial assistance?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('iskolar',3),('tulong pinansyal',3)) as k(kw,w)
where question = 'May scholarship o tulong pinansyal ba ang Lourdes College?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('eskolar',3),('tabang pinansyal',3)) as k(kw,w)
where question = 'Naa bay scholarship o tabang pinansyal ang Lourdes College?' on conflict do nothing;

-- =========================================================
-- 8. Tuition  →  Tuition & Fees
-- (No figures are given — the school does not publish them.)
-- =========================================================

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'How much is the tuition at Lourdes College?',
  'Tuition and other fees vary by program and year level and are not published on the school website. Please contact the Admissions Office or Cashier''s Office directly, or check the official enrollment portal at enroll.lccdo.edu.ph, for the current School Year''s fee schedule.',
  (select id from public.categories where name = 'Tuition & Fees' limit 1),
  'en', 2, 'active', 'Lourdes College Official Website', 'https://enroll.lccdo.edu.ph/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Magkano ang tuition sa Lourdes College?',
  'Iba-iba ang tuition at ibang bayarin depende sa programa at year level, at hindi ito nakalathala sa website ng paaralan. Mangyaring makipag-ugnayan nang direkta sa Admissions Office o Cashier''s Office, o tingnan ang opisyal na enrollment portal sa enroll.lccdo.edu.ph, para sa kasalukuyang fee schedule ng School Year.',
  (select id from public.categories where name = 'Tuition & Fees' limit 1),
  'fil', 2, 'active', 'Lourdes College Official Website', 'https://enroll.lccdo.edu.ph/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Tagpila ang tuition sa Lourdes College?',
  'Lahi-lahi ang tuition ug uban pang bayronon depende sa programa ug year level, ug wala kini gipatik sa website sa eskwelahan. Palihug direktang kontaka ang Admissions Office o Cashier''s Office, o tan-awa ang opisyal nga enrollment portal sa enroll.lccdo.edu.ph, para sa karon nga fee schedule sa School Year.',
  (select id from public.categories where name = 'Tuition & Fees' limit 1),
  'ceb', 2, 'active', 'Lourdes College Official Website', 'https://enroll.lccdo.edu.ph/'
) on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('tuition',3),('fees',3),('payment',2),('cost',2)) as k(kw,w)
where question = 'How much is the tuition at Lourdes College?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('tuition',3),('bayad',3),('matrikula',2)) as k(kw,w)
where question = 'Magkano ang tuition sa Lourdes College?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('tuition',3),('bayad',3),('matrikula',2)) as k(kw,w)
where question = 'Tagpila ang tuition sa Lourdes College?' on conflict do nothing;

-- =========================================================
-- 9. Registrar documents  →  Registrar
-- =========================================================

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'How do I request documents like a transcript or certificate from the Registrar?',
  'Document requests such as transcripts of records, certifications, and diplomas are processed through the Registrar''s Office at the main campus on Gen. Capistrano Street. Visit during office hours (Monday-Friday, 8:00 AM-5:00 PM; Saturday, 8:00 AM-12:00 NN) or contact the school beforehand to confirm current requirements and processing time.',
  (select id from public.categories where name = 'Registrar' limit 1),
  'en', 2, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/contact-us/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Paano ako makakahiling ng mga dokumento tulad ng transcript o certificate mula sa Registrar?',
  'Ang mga kahilingan para sa dokumento tulad ng transcript of records, certifications, at diploma ay pinoproseso sa Registrar''s Office sa main campus sa Gen. Capistrano Street. Bumisita sa oras ng opisina (Lunes-Biyernes, 8:00 AM-5:00 PM; Sabado, 8:00 AM-12:00 NN) o makipag-ugnayan muna sa paaralan para kumpirmahin ang kasalukuyang requirements at proseso.',
  (select id from public.categories where name = 'Registrar' limit 1),
  'fil', 2, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/contact-us/'
) on conflict do nothing;

insert into public.faqs (question, answer, category_id, language, priority, status, source_name, source_url)
values (
  'Unsaon nako pagpangayo og mga dokumento sama sa transcript o certificate gikan sa Registrar?',
  'Ang mga pangayo sa dokumento sama sa transcript of records, certifications, ug diploma giproseso sa Registrar''s Office sa main campus sa Gen. Capistrano Street. Bisita sa oras sa opisina (Lunes-Biyernes, 8:00 AM-5:00 PM; Sabado, 8:00 AM-12:00 NN) o kontaka una ang eskwelahan aron makumpirma ang karon nga requirements ug proseso.',
  (select id from public.categories where name = 'Registrar' limit 1),
  'ceb', 2, 'active', 'Lourdes College Official Website', 'https://lccdo.edu.ph/contact-us/'
) on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('registrar',3),('transcript',3),('certificate',2),('diploma',2),('documents',2)) as k(kw,w)
where question = 'How do I request documents like a transcript or certificate from the Registrar?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('registrar',3),('transcript',3),('dokumento',2)) as k(kw,w)
where question = 'Paano ako makakahiling ng mga dokumento tulad ng transcript o certificate mula sa Registrar?' on conflict do nothing;

insert into public.faq_keywords (faq_id, keyword, weight)
select id, kw, w from public.faqs, (values ('registrar',3),('transcript',3),('dokumento',2)) as k(kw,w)
where question = 'Unsaon nako pagpangayo og mga dokumento sama sa transcript o certificate gikan sa Registrar?' on conflict do nothing;
