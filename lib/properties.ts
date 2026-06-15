export interface VelarProperty {
  id: string;
  title: string;
  location: string;
  price: string;
  priceUSDCx: string;
  beds: number;
  baths: number;
  sqft: number;
  description: string;
  image: string;
  features: string[];
  agentName: string;
  agentAddress: string;
}

export const VELAR_PROPERTIES: VelarProperty[] = [
  {
    id: "villa-mare",
    title: "Villa Mare",
    location: "Amalfi Coast, Italy",
    price: "$4,850,000",
    priceUSDCx: "4,850,000",
    beds: 5,
    baths: 4,
    sqft: 6200,
    description:
      "A cliffside sanctuary overlooking the Tyrrhenian Sea. Infinity pool, private grotto access, and centuries-old olive terraces.",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=1000&fit=crop&q=80",
    features: ["Infinity Pool", "Private Beach", "Wine Cellar", "Helipad", "Smart Home"],
    agentName: "Isabella Conti",
    agentAddress: "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2SWW3M3",
  },
  {
    id: "the-penthouse",
    title: "The Arcon Penthouse",
    location: "Upper East Side, New York",
    price: "$9,200,000",
    priceUSDCx: "9,200,000",
    beds: 4,
    baths: 5,
    sqft: 4800,
    description:
      "Pre-war grandeur meets contemporary refinement. 360-degree skyline views from a 2,200 sq ft wraparound terrace.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=1000&fit=crop&q=80",
    features: ["Private Elevator", "Terrace", "Library", "Wine Room", "Concierge"],
    agentName: "Alexander Wolfe",
    agentAddress: "ST2GZQXJ7FQK8MZYWN1SEPKWYB3FFWFYBRBNK59P",
  },
  {
    id: "glass-house",
    title: "The Glass House",
    location: "Beverly Hills, California",
    price: "$7,400,000",
    priceUSDCx: "7,400,000",
    beds: 6,
    baths: 7,
    sqft: 7500,
    description:
      "Architectural masterpiece by Richard Meier. Floor-to-ceiling glass walls dissolve the boundary between interior and canyon.",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&h=1000&fit=crop&q=80",
    features: ["Pool", "Home Theater", "Gym", "8-Car Garage", "Guest House"],
    agentName: "Sofia Reyes",
    agentAddress: "ST35GP7N96HNGD9CYEBKBGFKKCWRBYKZX9QJ90YR",
  },
];
