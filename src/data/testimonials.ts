// Real letters of recommendation sent to Arnian Moving by clients and partners,
// published with their permission. Keep the wording as the authors wrote it.

export interface Testimonial {
  author: string;
  role?: string;
  place: string;
  date?: string;
  // Short excerpt shown on the card.
  excerpt: string;
  // Full letter, one string per paragraph. Shown behind "Read the full letter".
  letter: string[];
}

export const testimonials: Testimonial[] = [
  {
    author: "Shirleen J. Blevins",
    place: "Moved from Cabo to California",
    excerpt:
      "We also really appreciated how honest and fair they were, no upselling or surprise charges, just great service from start to finish, inclusive of the process of clearing customs.",
    letter: [
      "Moving is usually somewhere between stressful and mildly traumatic, particularly when giving up a beautiful international home of 13 years... but somehow, Abel and his team put me at ease with our first meeting and followed through to make it feel easy, giving me peace of mind that my items would be professionally and diligently cared for. No small feat for a cross-border logistics and transportation company (California to Baja California, Mexico). We also really appreciated how honest and fair they were, no upselling or surprise charges, just great service from start to finish, inclusive of the process of clearing customs.",
      "Each of the guys on the crew was incredible... fast, efficient, careful, and completely on top of everything. They packed with careful attention to each item and took special care to preserve delicate items securely. The two days of packing were organized, and not a single detail was missed. They were also clean, respectful of our space, and worked together like they've been doing this forever (which I assume they have, because it showed). And maybe, most importantly, they were just great to be around; friendly, upbeat, and made the two days of packing feel lighter and less stressful.",
      "We were kept updated throughout the entire shipping process, from Cabo departure to the Tijuana warehouse arrival, and through customs inspection to a delivery date at our California home.",
      "If every move could go like this, people wouldn't dread moving nearly as much, even across international borders.",
      "They provided an absolutely outstanding experience. From start to finish, Abel and the entire Arnian team were professional, patient, and genuinely kind.",
      "I highly, highly recommend The Arnian Group!",
    ],
  },
  {
    author: "Jerry Barbera",
    place: "San José del Cabo, BCS",
    date: "August 2026",
    excerpt:
      "Their communication throughout the entire process—from providing the initial quote all the way through to their post-delivery follow-up—was clear, proactive, and completely stress-free.",
    letter: [
      "Arnian Group delivered an exceptional moving experience from start to finish. Their communication throughout the entire process—from providing the initial quote all the way through to their post-delivery follow-up—was clear, proactive, and completely stress-free. Every staff member provided A+ care and attention, treating our household goods with the same precision and respect as if they were their own, ensuring everything arrived safely and intact.",
      "I cannot recommend Arnian Group highly enough for a move of any scale. Their professionalism, efficiency, and genuine dedication to customer satisfaction set a high standard, and should we ever move again, they will undoubtedly be our first and only call.",
    ],
  },
  {
    author: "John Castineiras",
    role: "Director, 365 Management",
    place: "Del Mar Los Cabos",
    excerpt:
      "The attention we are especially receiving from Abel is excellent and is one of the primary reasons why our clients are happy. We recommend Arnian to all our clients.",
    letter: [
      "I wanted to send a quick note to say thank you for the great service and attention Arnian has been providing our clients and myself. The attention we are especially receiving from Abel is excellent and is one of the primary reasons why our clients are happy.",
      "We recommend Arnian to all our clients and to those who ask about this service.",
      "Feel free to use this as a letter of recommendation for any future client questioning on using your service.",
    ],
  },
];
