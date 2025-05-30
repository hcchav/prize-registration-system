'use client';

import React from "react";
import Image from "next/image";
// import group from "./group.png";
// import image from "./image.svg";
import registrationBannerMobile1 from "/public/images/prizes/registration-banner-mobile-1.png";
import vector12 from "./vector-1-2.svg";
import vector1 from "/public/vector-1.svg";
import vector2 from "./vector-2.svg";
// import vector from "./vector.svg";

export default function RegistrationForm() {
    const testvariable = "test";
  
  return (
    <div>
   
<div id="registration-header" className="w-full flex justify-center items-center h-15 bg-white relative">
  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#abcae9] to-transparent" />
  <div className="w-60 h-12 relative">
    <Image
      src="/Mockup.svg"
      alt="Registration Header"
      fill
      className="object-contain"
      priority
    />
  </div>
</div>
    <div id="registration-form" className="bg-white flex flex-row justify-center w-full">
      <div className="bg-white w-[375px] h-[1309px] relative">
        <div className="absolute w-80 h-[1138px] top-[20px] left-[27px] rounded-[10px] border-2 border-solid border-[#abcae9] overflow-hidden">
          <div className="relative w-full h-[162px] overflow-hidden">
            <Image
              className="w-full h-full object-cover"
              alt="Registration banner"
              src={registrationBannerMobile1}
              width={320}
              height={162}
              priority
            />
          </div>

          <div className="flex flex-col w-80 items-center justify-center gap-3 px-3 py-0 absolute top-[182px] left-0">
            <h1 className="relative self-stretch text-[#00263a] text-xl text-center font-bold leading-tight tracking-tight font-poppins-bold">
              Join the{' '}
              <span className="relative inline-block">
                Biome <span className="relative">Brigade</span>
                <span className="absolute left-0 right-0 bottom-0.5 h-0.5 bg-[#00263a] opacity-10"></span>
              </span>
              ®
            </h1>
            <p className="relative self-stretch text-[#00263a] text-base text-center leading-relaxed font-poppins-regular">
              Register to win exclusive swag!
            </p>

            <div className="relative w-[282px] h-12">
              <div className="relative w-[280px] h-12 rounded-[5px]">
                <div className="absolute w-[266px] top-[13px] left-3.5 font-poppins-regular font-normal text-[#418fde] text-sm tracking-[0] leading-[22.4px]">
                  First Name
                </div>

                <div className="w-[280px] h-12 rounded-[5px] border border-solid absolute top-0 left-0 border-[#abcae9]" />
              </div>
            </div>

            <div className="relative w-[282px] h-12">
              <div className="relative w-[280px] h-12 rounded-[5px]">
                <div className="absolute w-[266px] top-[13px] left-3.5 font-poppins-regular font-normal text-[#418fde] text-sm tracking-[0] leading-[22.4px]">
                  Last Name
                </div>

                <div className="w-[280px] h-12 rounded-[5px] border border-solid absolute top-0 left-0 border-[#abcae9]" />
              </div>
            </div>

            <div className="relative w-[282px] h-12">
              <div className="relative w-[280px] h-12 rounded-[5px]">
                <div className="absolute w-[266px] top-[13px] left-3.5 font-poppins-regular font-normal text-[#418fde] text-sm tracking-[0] leading-[22.4px]">
                  Company Name
                </div>

                <div className="w-[280px] h-12 rounded-[5px] border border-solid absolute top-0 left-0 border-[#abcae9]" />
              </div>
            </div>

            <div className="relative w-[282px] h-12">
              <div className="relative w-[280px] h-12 rounded-[5px]">
                <div className="absolute w-[266px] top-3 left-3.5 font-poppins-regular font-normal text-[#418fde] text-sm tracking-[0] leading-[22.4px]">
                  Company Street Address
                </div>

                <div className="w-[280px] h-12 rounded-[5px] border border-solid absolute top-0 left-0 border-[#abcae9]" />
              </div>
            </div>

            <div className="relative w-[282px] h-12">
              <div className="relative w-[280px] h-12 rounded-[5px]">
                <div className="absolute w-[266px] top-[13px] left-3.5 font-poppins-regular font-normal text-[#418fde] text-sm tracking-[0] leading-[22.4px]">
                  Apt, Suite, Building (Optional)
                </div>

                <div className="w-[280px] h-12 rounded-[5px] border border-solid absolute top-0 left-0 border-[#abcae9]" />
              </div>
            </div>

            <div className="relative w-[282px] h-12">
              <div className="relative w-[280px] h-12 rounded-[5px]">
                <div className="absolute w-[266px] top-[13px] left-3.5 font-poppins-regular font-normal text-[#418fde] text-sm tracking-[0] leading-[22.4px]">
                  City
                </div>

                <div className="w-[280px] h-12 rounded-[5px] border border-solid absolute top-0 left-0 border-[#abcae9]" />
              </div>
            </div>
            <div className="inline-flex items-start gap-3 relative">
            <div className="w-[150px] relative h-12">
              <div className="w-[148px] relative h-12 rounded-[5px]">
                <div className="absolute w-[113px] top-[13px] left-[13px] font-poppins-regular font-normal text-[#418fde] text-sm tracking-[0] leading-[22.4px]">
                  State
                </div>

                <div className="absolute w-[148px] h-12 top-0 left-0 rounded-[5px] border border-solid border-[#abcae9]" />
              </div>
            </div>

            <div className="w-[122px] mr-[-2.00px] relative h-12">
              <div className="w-[120px] relative h-12 rounded-[5px]">
                <div className="absolute w-[94px] top-[13px] left-3.5 font-poppins-regular font-normal text-[#418fde] text-sm tracking-[0] leading-[22.4px]">
                  Zipcode
                </div>

                <div className="absolute w-[120px] h-12 top-0 left-0 rounded-[5px] border border-solid border-[#abcae9]" />
              </div>
            </div>
          </div>

         
        <div className="relative w-[280px] h-12 rounded-[5px]">
          <div className="absolute w-[231px] top-3 left-3.5 font-poppins-regular font-normal text-[#418fde] text-sm tracking-[0] leading-[22.4px]">
            Company Function (Select)
          </div>

          <div className="absolute w-[280px] h-12 top-0 left-0 rounded-[5px] border border-solid border-[#abcae9]" />

          <img
            className="absolute w-[13px] h-2.5 top-[19px] left-[252px]"
            alt="Vector"
            src={vector1}
          />
        </div>

        <div className="relative w-[280px] h-12 rounded-[5px]">
          <div className="absolute w-[231px] top-3 left-3.5 font-poppins-regular font-normal text-[#418fde] text-sm tracking-[0] leading-[22.4px]">
            Supplier Subcategory (Select)
          </div>

          <div className="absolute w-[280px] h-12 top-0 left-0 rounded-[5px] border border-solid border-[#abcae9]" />

          <img
            className="absolute w-[13px] h-2.5 top-[19px] left-[252px]"
            alt="Vector"
            src={vector1}
          />
        </div>


            <div className="relative w-[281.5px] h-[66px]">
              <p className="absolute w-[246px] top-0 left-[34px] font-poppins-regular font-normal text-[#00263a] text-sm tracking-[0] leading-[22.4px]">
                I consent to receive a verification code and be entered into a
                prize giveaway.
              </p>

              <div className="absolute w-5 h-5 top-[3px] left-0 rounded-sm border border-solid border-[#abcae9]" />
            </div>

            <div className="relative w-[282px] h-12">
              <div className="relative w-[280px] h-12 bg-[#418fde] rounded-[5px]">
                <div className="absolute w-[280px] top-3 left-0 font-poppins-semi-bold font-semibold text-white text-base text-center tracking-[0] leading-[25.6px] whitespace-nowrap">
                  Join the Brigade
                </div>
              </div>
            </div>
       
        </div>

      </div>
    </div>
   </div>
   </div>
  );
}
