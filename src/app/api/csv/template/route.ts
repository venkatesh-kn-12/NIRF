import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const moduleName = (searchParams.get("module") || "").toLowerCase();

  let csvContent = "";
  let filename = "template.csv";

  switch (moduleName) {
    case "students":
      filename = "mca_students_template.csv";
      csvContent = [
        "studentId,fullName,usn,email,program,batch,currentSemester,gender,category,homeState,stateType,isEconomicallyBackward,isSociallyChallenged,tuitionFeeReimbursed",
        "MCA2024001,Anil Kumar,1DS24MC001,anil.kumar@example.com,MCA,2024-2026,1,MALE,OBC,Karnataka,HOME_STATE,false,true,true",
        "MCA2024002,Pooja Sharma,1DS24MC002,pooja.sharma@example.com,MCA,2024-2026,1,FEMALE,GENERAL,Bihar,OTHER_STATES,false,false,false",
      ].join("\n");
      break;

    case "faculty":
      filename = "mca_faculty_template.csv";
      csvContent = [
        "facultyId,name,email,designation,employmentType,highestQualification,qualificationField,phdStatus,experienceYears,gender,dateOfJoining",
        "MCAFAC01,Dr. S. K. Ramesh,ramesh.sk@dsatm.edu,Professor,PERMANENT,Ph.D,Computer Applications,AWARDED,16,MALE,2018-08-01",
        "MCAFAC02,Prof. Deepa V.,deepa.v@dsatm.edu,Associate Professor,PERMANENT,M.Tech,Computer Science,PURSUING,9,FEMALE,2021-02-15",
      ].join("\n");
      break;

    case "publications":
      filename = "mca_publications_template.csv";
      csvContent = [
        "title,authors,publicationType,journalOrConference,publicationYear,indexing,doi,url,publisher",
        '"AI-Driven Anomaly Detection in Cloud Infrastructures","Dr. S. K. Ramesh, Deepa V.",JOURNAL,"IEEE Access",2024,SCOPUS,10.1109/ACCESS.2024.1234567,https://ieeexplore.ieee.org/document/123,IEEE',
        '"Scalable Microservices Framework for Health Informatics","Deepa V., Anil Kumar",CONFERENCE,"International Conference on Computing (ICC)",2023,SCOPUS,,https://springer.com/conf/123,Springer',
      ].join("\n");
      break;

    case "patents":
      filename = "mca_patents_template.csv";
      csvContent = [
        "title,applicationNumber,jurisdiction,applicant,inventors,filingDate,publicationDate,grantDate,legalStatus",
        '"Smart IoT Gatekeeper for Cryptographic Key Exchange",202341019876,INDIA,"Dayananda Sagar Academy of Technology and Management","Dr. S. K. Ramesh, Prof. Deepa V.",2023-04-12,2023-11-24,,PUBLISHED',
        '"Automated Brain MRI Lesion Classifier",202241098765,INDIA,"Dayananda Sagar Academy of Technology and Management","Dr. S. K. Ramesh",2022-01-15,2022-07-20,2024-03-10,GRANTED',
      ].join("\n");
      break;

    case "finance":
      filename = "mca_finance_template.csv";
      csvContent = [
        "financialYear,expenditureType,expenditureHead,granularity,amount,unit,purpose,isExcluded,exclusionType",
        '2024-25,CAPITAL,"Laboratory Equipment & Software Licenses",ANNUAL_AGGREGATE,1500000,INR,"Cloud AI computing lab hardware and VMware licenses",false,NONE',
        '2024-25,OPERATIONAL,"Faculty & Staff Salaries",ANNUAL_AGGREGATE,9500000,INR,"Department teaching and technical staff payroll",false,NONE',
        '2024-25,CAPITAL,"Building Renovation & Construction",ANNUAL_AGGREGATE,800000,INR,"Civil renovation of department seminar hall",true,BUILDING_CONSTRUCTION',
      ].join("\n");
      break;

    case "projects":
      filename = "mca_projects_consultancy_template.csv";
      csvContent = [
        "title,type,fundingAgencyOrClient,projectNumber,principalInvestigator,coInvestigators,sanctionedAmount,receivedAmount,startDate,endDate,scope,receiptFinancialYear,receiptAmount,receiptDate,receiptAllocationPct,receiptRef",
        '"Machine Learning for Smart Grid Fault Prediction",SPONSORED_PROJECT,"Department of Science and Technology (DST)",DST/MCA/2022/0123,Dr. S. K. Ramesh,"Prof. Deepa V.",500000,350000,2022-03-01,2024-02-28,DEPARTMENT,2022-23,150000,2022-09-15,100,DST/RECEIPT/001',
        '"AI-driven ERP Customisation for Healthcare Client",CONSULTANCY,"Apollo Hospitals (Bangalore)",CONS/MCA/2023/045,Prof. Deepa V.,"",80000,80000,2023-07-01,2023-12-31,DEPARTMENT,2023-24,80000,2023-11-30,100,CHAL/2023/001',
      ].join("\n");
      break;

    case "placements":
      filename = "mca_placements_template.csv";
      csvContent = [
        "studentReference,batch,employer,offerType,ctc,offerDate,joiningStatus,higherStudiesStatus,placementYear",
        "1DS22MC001,2022-2024,Infosys,ON_CAMPUS,750000,2024-04-10,JOINED,NO,2024",
        "1DS22MC002,2022-2024,Oracle,ON_CAMPUS,950000,2024-05-15,JOINED,NO,2024",
        "1DS22MC003,2022-2024,Higher Studies,OTHER,0,2024-06-01,DECLINED,ADMITTED,2024",
      ].join("\n");
      break;

    case "graduation-outcomes":
      filename = "mca_graduation_outcomes_template.csv";
      csvContent = [
        "programme,batch,eligibleGraduates,graduatesInStipulatedTime,examinationPassCount,higherStudiesCount,phdCompletionCount",
        "MCA,2020-2022,118,106,112,6,0",
        "MCA,2021-2023,120,110,115,8,0",
        "MCA,2022-2024,120,112,116,7,0",
      ].join("\n");
      break;

    case "doctoral-awards":
      filename = "mca_doctoral_awards_template.csv";
      csvContent = [
        "scholarName,studentReference,programme,thesisTitle,supervisorName,awardDate,awardYear",
        'Dr. Rajesh Kumar,1DS18MCA01,MCA,"Deep Learning Architectures for Autonomous Traffic Control",Dr. S. K. Ramesh,2023-09-15,2023',
      ].join("\n");
      break;

    default:
      return NextResponse.json(
        { error: "Unknown module. Choose from: students, faculty, publications, patents, finance, projects, placements, graduation-outcomes, doctoral-awards" },
        { status: 400 }
      );
  }

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
