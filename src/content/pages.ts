import type { ContentSection } from '@/calculators/types';
import { SITE } from '@/data/site';

/**
 * The site's information pages: About, Contact and the legal pages.
 * Each is published at /<slug>/ and linked from the footer on every page.
 */

export interface InfoPage {
  slug: 'about' | 'contact' | 'privacy-policy' | 'terms' | 'disclaimer';
  title: string;
  seoTitle: string;
  description: string;
  /** Shown under the H1. */
  lead: string;
  /** Legal pages print a "Last updated" line. */
  legal?: boolean;
  sections: ContentSection[];
}

const ADS_ON = SITE.adsenseClient !== '';

export const INFO_PAGES: InfoPage[] = [
  {
    slug: 'about',
    title: `About ${SITE.name}`,
    seoTitle: `About ${SITE.name} – Free Indian Financial Calculators & Guides`,
    description: `${SITE.name} offers free, accurate financial calculators and plain-English guides for India — loans, EMIs, investments, tax, salary and everyday maths.`,
    lead: 'Free, accurate financial calculators and plain-English guides for everyday money decisions in India.',
    sections: [
      {
        heading: 'What we do',
        paragraphs: [
          `${SITE.name} is a collection of financial and utility calculators built for Indian users — home, car, bike, personal and education loan EMIs, SIP and mutual fund returns, EPF, PPF, NPS, fixed and recurring deposits, income tax under both regimes, salary, gratuity, GST and more.`,
          'Every calculator comes with an explanation of how the number is worked out: the formula, a worked example, the assumptions behind it and answers to the questions people most often ask. Our guides go further, explaining the ideas behind the calculators — how an EMI is split between interest and principal, why compounding matters, how the old and new tax regimes differ — so you can make a decision rather than just read a number.',
        ],
      },
      {
        heading: 'How we build the calculators',
        bullets: [
          'Real formulas, not approximations. EMIs use the standard reducing-balance formula with a month-by-month amortisation schedule; EPF follows the EPFO monthly running-balance method; income tax applies slabs, rebate, surcharge, marginal relief and cess.',
          'Checked against published figures. The calculation engines are covered by automated tests that compare results with worked examples published by regulators, lenders and the Income Tax Department.',
          'Private by design. Calculations run entirely in your browser. The numbers you type are not sent to us or stored on any server.',
          'Kept current. Rates and rules that change — tax slabs, small-savings interest rates, EPF rates — are reviewed when governments and regulators announce changes.',
        ],
      },
      {
        heading: 'What we are not',
        paragraphs: [
          `${SITE.name} is an educational tool. We are not a bank, a lender, a broker, a tax practitioner or a registered investment adviser, and nothing on this site is a recommendation to buy, sell or borrow anything. The results are estimates: your lender, fund house or the tax department may arrive at slightly different figures because of fees, rounding, dates and rules specific to your case. Please read our Disclaimer, and speak to a qualified professional before making a major financial decision.`,
        ],
      },
      {
        heading: 'Get in touch',
        paragraphs: [
          `Spotted a mistake, want a calculator we do not have yet, or have a question about a result? Write to ${SITE.contactEmail} — every message is read, and corrections are fixed quickly.`,
        ],
      },
    ],
  },
  {
    slug: 'contact',
    title: 'Contact us',
    seoTitle: `Contact ${SITE.name}`,
    description: `Contact the ${SITE.name} team to report an error, suggest a calculator or ask a question about a result.`,
    lead: 'Questions, corrections and suggestions are all welcome.',
    sections: [
      {
        heading: 'Email',
        paragraphs: [
          `The quickest way to reach us is by email at ${SITE.contactEmail}. We aim to reply within two working days.`,
        ],
      },
      {
        heading: 'What to include',
        bullets: [
          'The calculator or guide you were using (the page address is ideal).',
          'The values you entered — the "Copy link" button under a result copies a link that reopens the calculator with exactly those inputs.',
          'What you expected to see, and where that figure came from (for example, a lender’s sanction letter or a published example).',
        ],
      },
      {
        heading: 'What we cannot help with',
        paragraphs: [
          'We cannot give personal financial, tax, legal or investment advice, recommend a specific lender or fund, or help with an account you hold at a bank, lender, fund house or government scheme. For those, please contact the institution directly or a qualified professional.',
        ],
      },
    ],
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    seoTitle: `Privacy Policy | ${SITE.name}`,
    description: `How ${SITE.name} handles your information: calculations stay in your browser, what is stored on your device, cookies, advertising and your choices.`,
    lead: `This policy explains what information ${SITE.name} (“we”, “us”) collects when you use this website, and how it is used.`,
    legal: true,
    sections: [
      {
        heading: 'The short version',
        bullets: [
          'The numbers you type into a calculator never leave your device. Every calculation runs inside your browser.',
          'We do not ask you to create an account and do not collect your name, phone number, PAN, income or any other personal details through the calculators.',
          'A few preferences — theme, language, favourites and recently used calculators — are saved in your browser’s local storage so the site remembers them. You can clear them at any time.',
          ADS_ON
            ? 'This site shows advertising served by Google, which uses cookies. See “Advertising” below for details and your choices.'
            : 'If we show advertising in future, it will be served by Google and use cookies; this policy explains how, and will be kept up to date.',
        ],
      },
      {
        heading: 'Information stored on your device',
        paragraphs: [
          'We use your browser’s local storage (not cookies) to remember your chosen colour theme, light or dark mode, language, favourite calculators and recently used calculators. This information stays on your device, is never sent to us and can be removed by clearing your browser’s site data for this website.',
          'When you use the “Copy link” or “Share” buttons, the inputs you entered are placed in the web address so that the link reopens the same calculation. That link is only shared if you choose to share it.',
        ],
      },
      {
        heading: 'Information collected automatically',
        paragraphs: [
          'Like every website, our hosting provider automatically receives technical information when your browser requests a page — such as your IP address, browser type, the page requested and the time of the request. This is used to deliver the site, keep it secure and diagnose faults, and is retained only for as long as the hosting provider needs it for those purposes.',
        ],
      },
      {
        heading: 'Advertising',
        paragraphs: [
          ADS_ON
            ? 'We use Google AdSense to show advertisements. Google, as a third-party vendor, uses cookies to serve ads on this site.'
            : 'We may use Google AdSense to show advertisements. If we do, Google, as a third-party vendor, will use cookies to serve ads on this site.',
          'Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet. You may opt out of personalised advertising by visiting Google’s Ads Settings (https://adssettings.google.com). You can also opt out of some third-party vendors’ use of cookies for personalised advertising at www.aboutads.info.',
          'For more information about how Google uses data when you use our site, see “How Google uses information from sites or apps that use our services” at https://policies.google.com/technologies/partner-sites.',
          'Where the law requires it — for example for visitors in the European Economic Area, the United Kingdom or Switzerland — ads are only personalised after you give consent through a consent message, and you can change your choice at any time.',
        ],
      },
      {
        heading: 'Children',
        paragraphs: [
          'This website is intended for a general adult audience and is not directed at children under 13. We do not knowingly collect personal information from children.',
        ],
      },
      {
        heading: 'Links to other websites',
        paragraphs: [
          'Guides and calculators may link to government, regulator or other external websites for reference. We are not responsible for the privacy practices of those websites; please read their policies.',
        ],
      },
      {
        heading: 'Your choices',
        bullets: [
          'Clear this site’s data in your browser settings to remove saved preferences.',
          'Block or delete cookies through your browser settings. The calculators work without cookies.',
          'Manage personalised advertising through Google’s Ads Settings.',
        ],
      },
      {
        heading: 'Changes to this policy',
        paragraphs: [
          'If we change how we handle information — for example when we start or stop showing ads, or add a feature that needs data — we will update this page and the “Last updated” date above.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [`Questions about this policy can be sent to ${SITE.contactEmail}.`],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms & Conditions',
    seoTitle: `Terms & Conditions | ${SITE.name}`,
    description: `The terms that apply when you use ${SITE.name}'s calculators and guides.`,
    lead: `By using ${SITE.name} you agree to these terms. Please read them together with our Disclaimer and Privacy Policy.`,
    legal: true,
    sections: [
      {
        heading: 'Use of the website',
        paragraphs: [
          `${SITE.name} provides financial calculators and educational content free of charge for personal, non-commercial use. You may use the calculators, print or save your own results, and share links to pages on this site.`,
          'You agree not to misuse the website — for example by attempting to disrupt it, access it by automated means that place an unreasonable load on it, or copy and republish its content as your own.',
        ],
      },
      {
        heading: 'No advice',
        paragraphs: [
          'Everything on this website is general information for educational purposes. It is not financial, investment, tax, legal or credit advice, and it does not take your personal circumstances into account. See our Disclaimer for details.',
        ],
      },
      {
        heading: 'Accuracy of results',
        paragraphs: [
          'We take care to use correct formulas and current rules, but results are estimates based on the values you enter and the assumptions described on each calculator. Actual figures from lenders, fund houses, employers or tax authorities can differ. Always confirm important figures with the relevant institution before acting on them.',
        ],
      },
      {
        heading: 'Intellectual property',
        paragraphs: [
          `The text, calculators, design and code of this website belong to ${SITE.name}. You may quote short extracts with a link back to the source page. Any other reproduction requires our written permission.`,
        ],
      },
      {
        heading: 'Third-party links and advertising',
        paragraphs: [
          'The website may contain links to other websites and may display advertisements served by third parties. We do not control and are not responsible for the content, products or services offered on those websites or in those advertisements.',
        ],
      },
      {
        heading: 'Limitation of liability',
        paragraphs: [
          `To the fullest extent permitted by law, ${SITE.name} is not liable for any loss or damage arising from the use of, or reliance on, this website, its calculators or its content. The website is provided “as is”, without warranties of any kind.`,
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'We may update these terms from time to time. The “Last updated” date above shows when they last changed; continuing to use the website after a change means you accept the updated terms.',
        ],
      },
      {
        heading: 'Governing law',
        paragraphs: ['These terms are governed by the laws of India.'],
      },
      {
        heading: 'Contact',
        paragraphs: [`Questions about these terms can be sent to ${SITE.contactEmail}.`],
      },
    ],
  },
  {
    slug: 'disclaimer',
    title: 'Financial Disclaimer',
    seoTitle: `Financial Disclaimer | ${SITE.name}`,
    description: `${SITE.name}'s calculators and guides are for general information only and are not financial, tax or investment advice.`,
    lead: `${SITE.name} provides financial calculators and educational information for general informational purposes only.`,
    legal: true,
    sections: [
      {
        heading: 'Estimates, not guarantees',
        paragraphs: [
          'Results are estimates based on the values you enter and the assumptions stated on each calculator. They may differ from the actual figures offered by banks, lenders, fund houses, employers or government bodies because of fees, charges, taxes, rounding, dates, rate changes and rules that apply to your particular situation.',
          'Investment returns are never guaranteed. Projections of mutual fund, equity, NPS or other market-linked returns use the rate you choose; actual returns can be higher or lower, and can be negative. Past performance does not indicate future results.',
        ],
      },
      {
        heading: 'Not professional advice',
        paragraphs: [
          `${SITE.name} is not a bank, NBFC, broker, SEBI-registered investment adviser, chartered accountant or tax practitioner. Nothing on this website is a recommendation to take a loan, make an investment, choose a tax regime or buy any product. Consider speaking to a qualified professional before making financial decisions.`,
        ],
      },
      {
        heading: 'Tax and interest rates',
        paragraphs: [
          'Tax slabs, deductions and government scheme interest rates change. We update the calculators when changes are announced, but there can be a delay, and a calculator may not reflect every exception in the law. Always check current rules with the Income Tax Department, EPFO, India Post or the relevant authority.',
        ],
      },
      {
        heading: 'Lender and product information',
        paragraphs: [
          'Interest rate ranges, loan-to-value limits, fees and eligibility rules mentioned in guides are typical figures given for illustration. Each lender sets its own terms. Check the current terms with the lender before you apply.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [`If you believe a calculation or statement on this website is wrong, please tell us at ${SITE.contactEmail}.`],
      },
    ],
  },
];

export const infoPageBySlug = (slug: string): InfoPage | undefined => INFO_PAGES.find((p) => p.slug === slug);
