export interface ShowcaseVideo {
  slug: string;
  src: string;
  poster: string;
  label: string;
  title: string;
  description: string;
}

export const showcaseVideos: ShowcaseVideo[] = [
  {
    slug: "on-the-road",
    src: "/videos/arnian-moving-2.mp4",
    poster: "/videos/arnian-moving-2-poster.jpg",
    label: "On the road, San Diego to Baja",
    title: "On The Road from San Diego to Baja",
    description:
      "Ride along as our crew transports belongings across the border, from San Diego to Baja California.",
  },
  {
    slug: "residential-move-in",
    src: "/videos/arnian-moving-1.mp4",
    poster: "/videos/arnian-moving-1-poster.jpg",
    label: "Residential move-in, Baja California",
    title: "Residential Move-In in Baja California",
    description:
      "Real footage of our crew moving a family into their new home in Baja California, start to finish.",
  },
];
