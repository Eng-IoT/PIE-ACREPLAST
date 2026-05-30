export type Worker = { 
  id: string; 
  name: string; 
  role: string; 
  status: string; 
  certificateValidity: string;
  statusHistory?: { date: string; status: string }[];
};

export type ActionPlanItem = { 
  id: string; 
  status: string; 
  description: string; 
  priority?: string; 
};
