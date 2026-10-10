import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom';

const UploadThing = () => {
    const { id } = useParams();

  return (
    <iframe src={`https://dv3nfquq81.ufs.sh/f/${id}`} style={{height:"100vh", width:"100vw"}}></iframe>
  )
}

export default UploadThing