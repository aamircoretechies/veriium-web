"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadToCloudinary } from '@/lib/cloudinary/upload';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Switch } from '@/app/components/ui/switch';
import Footer from '../../../app/components/Footer';
import PublicHeader from '@/app/components/PublicHeader';
import { GWINNETT_ZIP_LOCATIONS } from '@/lib/constants/gwinnett-zips';

const GWINNETT_ZIPS = GWINNETT_ZIP_LOCATIONS.map(({ zip, city }) => ({
  zip,
  city,
}));

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error?.message ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

export default function ApplyAsMechanic() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [driverLicenseFile, setDriverLicenseFile] = useState<File | null>(null);
  const [aseCertificationFile, setAseCertificationFile] = useState<File | null>(null);
  const [insuranceDocumentFile, setInsuranceDocumentFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    yearsExp: '',
    bio: '',
    languages: '',
    aseCertified: false,
    otherCerts: '',
    services: {
      engine: false,
      brakes: false,
      suspension: false,
      electrical: false,
      diagnostics: false,
      general: false,
      other: false,
    },
    mobileAvailable: false,
    shopAvailable: false,
    selectedZips: [] as string[],
    shopAddress: '',
    toolsConfirmed: false,
    transportConfirmed: false,
    mobileRepairsConfirmed: false,
    acceptingJobs: true,
    agreements: {
      terms: false,
      background: false,
      communication: false,
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceChange = (service: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      services: { ...prev.services, [service]: checked }
    }));
  };

  const handleAgreementChange = (agreement: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      agreements: { ...prev.agreements, [agreement]: checked }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreements.terms || !formData.agreements.background || !formData.agreements.communication) {
      alert("Please agree to all terms and consents to proceed.");
      return;
    }
    if (!driverLicenseFile) {
      setSubmitError("Please upload your driver license or government ID.");
      return;
    }
    if (formData.selectedZips.length === 0) {
      setSubmitError("Please select at least one service area ZIP code.");
      return;
    }

    setSubmitError("");
    setLoading(true);

    try {
      let profilePhotoUrl: string | undefined;
      let driverLicenseUrl: string | undefined;
      let aseCertificationUrl: string | undefined;
      let insuranceDocumentUrl: string | undefined;

      if (profilePhotoFile) {
        profilePhotoUrl = await uploadToCloudinary(profilePhotoFile);
      }
      driverLicenseUrl = await uploadToCloudinary(driverLicenseFile);
      if (aseCertificationFile) {
        aseCertificationUrl = await uploadToCloudinary(aseCertificationFile);
      }
      if (insuranceDocumentFile) {
        insuranceDocumentUrl = await uploadToCloudinary(insuranceDocumentFile);
      }

      const yearsExperience = formData.yearsExp
        ? parseInt(formData.yearsExp, 10)
        : undefined;

      const payload = {
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email || undefined,
        bio: formData.bio || undefined,
        languages: formData.languages || undefined,
        yearsExperience: Number.isNaN(yearsExperience) ? undefined : yearsExperience,
        aseCertified: formData.aseCertified,
        otherCertifications: formData.otherCerts || undefined,
        services: formData.services,
        mobileAvailable: formData.mobileAvailable,
        shopAvailable: formData.shopAvailable,
        primaryZip: formData.selectedZips[0] ?? '',
        additionalZips: formData.selectedZips.slice(1),
        shopAddress: formData.shopAddress || undefined,
        toolsConfirmed: formData.toolsConfirmed,
        transportConfirmed: formData.transportConfirmed,
        mobileRepairsConfirmed: formData.mobileRepairsConfirmed,
        profilePhotoUrl,
        driverLicenseUrl,
        aseCertificationUrl,
        insuranceDocumentUrl,
      };

      const res = await fetch("/api/mechanics/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setSubmitError(await parseApiError(res));
        return;
      }

      setSuccess(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Unable to submit application. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] flex flex-col items-center">
        <PublicHeader hideAuthButtons />

        <div className="flex-1 w-full max-w-2xl py-[60px] px-[20px]">
          <Card className="w-full text-center border-none shadow-lg">
            <CardHeader className="pb-8 pt-12">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle className="text-3xl font-['Albert_Sans:Bold',sans-serif]">Application Submitted Successfully</CardTitle>
              <CardDescription className="text-lg mt-4 font-['Albert_Sans:Regular',sans-serif]">
                Your application is currently under review.
              </CardDescription>
            </CardHeader>
            <CardContent className="font-['Albert_Sans:Regular',sans-serif] text-gray-600 mb-8">
              <p>We typically review applications within 1-3 business days. We will contact you at <strong>{formData.email}</strong> once your background check and credentials have been verified.</p>
            </CardContent>
            <CardFooter className="justify-center pb-12">
              <Button onClick={() => router.push('/public')} className="bg-[#ffa270] hover:bg-[#ff8f52] text-black font-bold h-12 px-8 text-lg rounded-xl">
                Return to Homepage
              </Button>
            </CardFooter>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col items-center">
      <PublicHeader hideAuthButtons />

      <div className="flex-1 w-full max-w-3xl py-[40px] px-[20px]">
        
        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-['Fustat:Bold',sans-serif] font-bold text-black mb-4">Apply as a Mechanic</h1>
          <p className="text-lg text-gray-600 font-['Albert_Sans:Regular',sans-serif]">Join our trusted network of mechanics and grow your business with Veriium.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm font-['Albert_Sans:Medium',sans-serif] text-gray-500">
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffa270" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
              Verified Trust
            </span>
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffa270" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Flexible Hours
            </span>
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffa270" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Upfront Pricing
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-none shadow-lg mb-8">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="font-['Albert_Sans:Bold',sans-serif] text-xl">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullName" className="font-['Albert_Sans:Medium',sans-serif]">Full Name *</Label>
                  <Input id="fullName" required value={formData.fullName} onChange={e => handleInputChange('fullName', e.target.value)} placeholder="John Doe" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone" className="font-['Albert_Sans:Medium',sans-serif]">Phone Number *</Label>
                  <Input id="phone" type="tel" required value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} placeholder="(555) 123-4567" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="font-['Albert_Sans:Medium',sans-serif]">Email Address *</Label>
                <Input id="email" type="email" required value={formData.email} onChange={e => handleInputChange('email', e.target.value)} placeholder="john@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profilePhoto" className="font-['Albert_Sans:Medium',sans-serif]">Profile Photo (Optional)</Label>
                <Input
                  id="profilePhoto"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfilePhotoFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg mb-8">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="font-['Albert_Sans:Bold',sans-serif] text-xl">Professional Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="yearsExp" className="font-['Albert_Sans:Medium',sans-serif]">Years of Experience *</Label>
                <Input id="yearsExp" type="number" min="0" required value={formData.yearsExp} onChange={e => handleInputChange('yearsExp', e.target.value)} placeholder="e.g. 5" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio" className="font-['Albert_Sans:Medium',sans-serif]">Professional Bio / About Me *</Label>
                <Textarea id="bio" required value={formData.bio} onChange={e => handleInputChange('bio', e.target.value)} placeholder="Tell drivers about your experience and expertise..." className="h-24" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="languages" className="font-['Albert_Sans:Medium',sans-serif]">Languages Spoken</Label>
                <Input id="languages" value={formData.languages} onChange={e => handleInputChange('languages', e.target.value)} placeholder="English, Spanish, etc." />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="aseCertified" checked={formData.aseCertified} onCheckedChange={c => handleInputChange('aseCertified', c)} />
                <Label htmlFor="aseCertified" className="font-['Albert_Sans:Medium',sans-serif]">I am ASE Certified</Label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="otherCerts" className="font-['Albert_Sans:Medium',sans-serif]">Other Certifications</Label>
                <Input id="otherCerts" value={formData.otherCerts} onChange={e => handleInputChange('otherCerts', e.target.value)} placeholder="List any other relevant certifications" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg mb-8">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="font-['Albert_Sans:Bold',sans-serif] text-xl">Service Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6">
              <div className="grid gap-3">
                <Label className="font-['Albert_Sans:Medium',sans-serif] text-base mb-2">Service Categories</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(formData.services).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox id={`service-${key}`} checked={value as boolean} onCheckedChange={(c) => handleServiceChange(key, c as boolean)} />
                      <Label htmlFor={`service-${key}`} className="capitalize cursor-pointer">{key}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-px bg-gray-200 w-full my-2"></div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="mobileAvailable" className="text-base">Mobile Mechanic</Label>
                    <p className="text-sm text-gray-500">I can travel to customers</p>
                  </div>
                  <Switch id="mobileAvailable" checked={formData.mobileAvailable} onCheckedChange={c => handleInputChange('mobileAvailable', c)} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="shopAvailable" className="text-base">Shop-Based Service</Label>
                    <p className="text-sm text-gray-500">Customers come to me</p>
                  </div>
                  <Switch id="shopAvailable" checked={formData.shopAvailable} onCheckedChange={c => handleInputChange('shopAvailable', c)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg mb-8">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="font-['Albert_Sans:Bold',sans-serif] text-xl">Service Area & Tools</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6">
              {/* Gwinnett County ZIP multi-select */}
              <div className="flex flex-col gap-3">
                <div>
                  <Label className="font-['Albert_Sans:SemiBold',sans-serif] text-sm text-black">
                    Service Area ZIP Codes *
                  </Label>
                  <p className="text-sm text-gray-500 font-['Albert_Sans:Regular',sans-serif] mt-1">
                    Select all ZIP codes within Gwinnett County, GA where you are available to work. At least one is required.
                  </p>
                </div>

                {/* County label */}
                <div className="flex items-center gap-2 mt-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffa270" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span className="text-xs font-['Albert_Sans:SemiBold',sans-serif] text-[#ffa270] uppercase tracking-wide">Gwinnett County, Georgia — Pilot Service Area</span>
                </div>

                {/* Select All / Clear All */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleInputChange('selectedZips', GWINNETT_ZIPS.map(z => z.zip))}
                    className="text-xs font-['Albert_Sans:SemiBold',sans-serif] text-[#ffa270] hover:underline cursor-pointer select-none"
                  >
                    Select All ({GWINNETT_ZIPS.length})
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleInputChange('selectedZips', [])}
                    className="text-xs font-['Albert_Sans:SemiBold',sans-serif] text-gray-400 hover:underline cursor-pointer select-none"
                  >
                    Clear All
                  </button>
                  {formData.selectedZips.length > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-xs font-['Albert_Sans:SemiBold',sans-serif] text-black">
                        {formData.selectedZips.length} selected
                      </span>
                    </>
                  )}
                </div>

                {/* ZIP grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-gray-200 rounded-xl p-4 bg-gray-50/50 max-h-[380px] overflow-y-auto">
                  {GWINNETT_ZIPS.map(({ zip, city }) => {
                    const checked = formData.selectedZips.includes(zip);
                    return (
                      <label
                        key={zip}
                        className={`flex items-center gap-3 px-3 py-[10px] rounded-[10px] cursor-pointer transition-colors duration-150 select-none ${
                          checked ? 'bg-[#fff3ee] border border-[#ffa270]' : 'bg-white border border-gray-200 hover:border-[#ffa270]'
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => {
                            const next = c
                              ? [...formData.selectedZips, zip]
                              : formData.selectedZips.filter(z => z !== zip);
                            handleInputChange('selectedZips', next);
                          }}
                          id={`zip-${zip}`}
                          aria-label={`ZIP code ${zip} — ${city}`}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-['Albert_Sans:Bold',sans-serif] text-sm text-black">{zip}</span>
                          <span className="font-['Albert_Sans:Regular',sans-serif] text-xs text-gray-500 truncate">{city}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Shop address (conditional) */}
              {formData.shopAvailable && (
                <div className="grid gap-2">
                  <Label htmlFor="shopAddress" className="font-['Albert_Sans:Medium',sans-serif]">Shop Address</Label>
                  <Textarea id="shopAddress" value={formData.shopAddress} onChange={e => handleInputChange('shopAddress', e.target.value)} placeholder="Full address of your shop" />
                </div>
              )}

              {/* Tool / transport confirmations */}
              <div className="space-y-4 mt-2">
                <div className="flex items-start space-x-3">
                  <Checkbox id="toolsConfirmed" checked={formData.toolsConfirmed} onCheckedChange={c => handleInputChange('toolsConfirmed', c)} className="mt-1" />
                  <Label htmlFor="toolsConfirmed" className="font-['Albert_Sans:Regular',sans-serif] leading-relaxed">I confirm that I have the necessary tools and equipment to perform the services I selected.</Label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox id="transportConfirmed" checked={formData.transportConfirmed} onCheckedChange={c => handleInputChange('transportConfirmed', c)} className="mt-1" />
                  <Label htmlFor="transportConfirmed" className="font-['Albert_Sans:Regular',sans-serif] leading-relaxed">I confirm that I have reliable transportation for mobile repairs.</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg mb-8">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="font-['Albert_Sans:Bold',sans-serif] text-xl">Document Upload</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="driverLicense" className="font-['Albert_Sans:Medium',sans-serif]">Driver License / Government ID *</Label>
                <Input
                  id="driverLicense"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setDriverLicenseFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="aseDoc" className="font-['Albert_Sans:Medium',sans-serif]">ASE Certification Upload (if applicable)</Label>
                <Input id="aseDoc" type="file" accept=".pdf,image/*" onChange={(e) => setAseCertificationFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="insuranceDoc" className="font-['Albert_Sans:Medium',sans-serif]">Insurance Document (if applicable)</Label>
                <Input id="insuranceDoc" type="file" accept=".pdf,image/*" onChange={(e) => setInsuranceDocumentFile(e.target.files?.[0] ?? null)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg mb-8">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="font-['Albert_Sans:Bold',sans-serif] text-xl">Availability & Consents</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid gap-6">
              <div className="space-y-4 mt-4">
                <div className="flex items-start space-x-3">
                  <Checkbox id="terms" required checked={formData.agreements.terms} onCheckedChange={c => handleAgreementChange('terms', c as boolean)} className="mt-1" />
                  <Label htmlFor="terms" className="font-['Albert_Sans:Regular',sans-serif] leading-relaxed cursor-pointer">I agree to the Terms & Conditions and Privacy Policy. *</Label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox id="background" required checked={formData.agreements.background} onCheckedChange={c => handleAgreementChange('background', c as boolean)} className="mt-1" />
                  <Label htmlFor="background" className="font-['Albert_Sans:Regular',sans-serif] leading-relaxed cursor-pointer">I consent to a background verification check. *</Label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox id="communication" required checked={formData.agreements.communication} onCheckedChange={c => handleAgreementChange('communication', c as boolean)} className="mt-1" />
                  <Label htmlFor="communication" className="font-['Albert_Sans:Regular',sans-serif] leading-relaxed cursor-pointer">I consent to receive communication (SMS/Email) regarding my application. *</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col items-center">
            <h3 className="font-['Albert_Sans:Bold',sans-serif] text-xl mb-2">Ready to submit?</h3>
            <p className="text-gray-500 mb-6 text-center font-['Albert_Sans:Regular',sans-serif]">Please review your information before submitting. You will not be able to edit this after submission.</p>
            {submitError && (
              <p className="text-red-600 text-sm mb-4 text-center font-['Albert_Sans:Regular',sans-serif]">{submitError}</p>
            )}
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-[#ffa270] hover:bg-[#ff8f52] text-black font-bold h-14 w-full md:w-2/3 text-lg rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting Application...
                </span>
              ) : (
                "Submit Application"
              )}
            </Button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
