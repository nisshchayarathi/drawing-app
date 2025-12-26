import { ReactNode } from "react";

export function IconButton ({
    icon, onClick , activated
}:{icon: ReactNode,
    onClick:()=>void,
    activated:boolean
}){
return (
  <div
    onClick={onClick}
    className={`
  m-2
  cursor-pointer
  rounded-full
  border
  border-gray-400
  p-1
  hover:bg-gray-600
  transition
  ${activated ? "text-red-500" : "text-white"}
`}>
    {icon}
  </div>
);

}