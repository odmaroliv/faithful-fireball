/**
 * Site Configuration
 *
 * All site-specific content and configuration settings that might
 * need to change between different domains or deployments.
 */

export const siteConfig = {
  // Basic site information
  name: "Arnian Moving",
  domain: "arnianmoving.com",
  title: "Arnian Moving | Cross-Border Movers Between California and Baja",
  description:
    "Bilingual cross-border movers between California and Baja California, in both directions. Packing, customs paperwork, transport and delivery from Tijuana to Cabo.",

  // Company information
  company: {
    name: "Arnian Moving",
    legalName: "Arnian Moving LLC",
    foundedYear: 2013,
    tagline: "Stress-free cross-border moving from California to Baja",
    experience: "Moving families across the border since 2013",
  },

  // Contact information
  contact: {
    // Calls go to one line, WhatsApp messages to another.
    phone: "+52 (664) 388 6256",
    phoneLink: "+526643886256", // for tel: links
    email: "info@arnianmoving.com",
    whatsapp: "+526643850871", // No spaces or special chars for WhatsApp links
    whatsappDisplay: "+52 (664) 385 0871",
    operatingHours: "Mon-Fri, 9am-5pm PST",
    locations: [
      {
        city: "San Diego",
        state: "CA",
        country: "US",
        address: "9948 Via de la Amistad",
        postalCode: "92154",
        latitude: "",
        longitude: "",
      },
      {
        city: "Tijuana",
        state: "BC",
        country: "MX",
        address: "C. Laguna Salada 4939, Lago Sur",
        postalCode: "22217",
        latitude: "",
        longitude: "",
      },
    ],
  },

  // Social media links
  social: {
    facebook: "https://www.facebook.com/arnianmoving/",
    instagram: "https://www.instagram.com/arnianmoving",
    linkedin: "https://www.linkedin.com/company/arnian-moving",
    messenger: "https://m.me/arnianmoving",
  },

  // Destinations served
  destinations: [
    "Rosarito",
    "Ensenada",
    "Tijuana",
    "San Quintín",
    "Los Barriles",
    "Cerritos",
    "San José del Cabo",
    "Cabo San Lucas",
    "La Paz",
    "Loreto",
    "Todos Santos",
    "Mulegé",
    "San Felipe",
    "Tecate",
  ],
};
