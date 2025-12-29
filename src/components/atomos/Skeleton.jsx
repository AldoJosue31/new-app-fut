import styled, { keyframes } from "styled-components";

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Base = styled.div`
  background: ${({theme}) => theme.bgtotal};
  background-image: linear-gradient(
    90deg, 
    ${({theme}) => theme.bgtotal} 0px, 
    ${({theme}) => theme.bg2} 50%, 
    ${({theme}) => theme.bgtotal} 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite linear;
  border-radius: ${({radius}) => radius || '8px'};
  width: ${({width}) => width || '100%'};
  height: ${({height}) => height || '20px'};
`;

export const Skeleton = ({ type = "rect", width, height, radius, style }) => {
  const finalRadius = type === 'circle' ? '50%' : radius;
  return <Base width={width} height={height} radius={finalRadius} style={style} />;
};