$(document).ready(function () {



    params = getParams(window.location.href)
    flow_id = params.id
    //window.setInterval(checkResultReady, 3000);
    unsubscribe = db.collection("Workflows").doc(flow_id)
        .onSnapshot(function (doc) {
            //var source = doc.metadata.hasPendingWrites ? "Local" : "Server";
            //console.log(source, " data: ", doc.data());
            //console.log(doc.metadata.hasPendingWrites)
            if (!doc.metadata.hasPendingWrites && doc.data()) {

                if (doc.data().ready) {
                    if (doc.data().isDeleted === undefined || doc.data().isDeleted === null || doc.data().isDeleted) {
                        window.location.href = '../404.html';
                    }
                    //console.log("we are ready");
                    workflowData = doc.data()
                    $(document).trigger("dataready", doc);
                    unsubscribe()
                }
            }
        });
});

$(document).on("authready", function (event) {

    openWaitingModal();


});
var workFlowClosedState = false;
$(document).on("dataready", function (event, doc) {

    //console.log(doc.data())
    workflowMeta = doc.data()
    displayBreadCrumbs(workflowMeta)
    //$( document ).tooltip();
    //  addHiddenFieldForStepID(workflowMeta["active_step_id"])
    displayWorkflow();
    workFlowClosedState = workflowMeta["closed"]
    if (workFlowClosedState) {
        $("#reopenbuttonsection").removeClass("invisible")
    }
    else {
        $("#reopenbuttonsection").remove()
    }


});


$(document).on("formloaded", function (event) {

    closeAllModals()


});

function openWaitingModal() {
    $("#loading").modal({
        escapeClose: false,
        clickClose: false,
        showClose: false
    });
}

function openSavingModal() {
    $("#saving").modal({
        escapeClose: false,
        clickClose: false,
        showClose: false
    });
}



function checkResultReady() {
    //ready=db.collection("Workflows").doc(flow_id)
    //console.log("Checking");
}


async function displayWorkflow() {
    params = getParams(window.location.href)
    flow_id = params.id
    // Download button visibility
    isValidDownloadPDF = await isValidStepForDownload()
    //displayBreadCrumbs(flow_id)
    populateSteps(flow_id, isValidDownloadPDF)
    populateLogs(flow_id)
    appendComments(flow_id)

    $(document).trigger("formloaded");
}

async function displayBreadCrumbs(doc_data) {
    stepMeta = doc_data["allSteps"]
    stepCount = stepMeta.length
    activeStepID = doc_data["active_step_id"]
    closedState = doc_data["closed"]

    var activeFlag = false;
    for (i = 0; i < stepCount; i++) {
        activeFlag = false
        step_name = stepMeta[i]["name"]
        step_ID = stepMeta[i]["id"]

        if (step_ID === activeStepID) {
            activeFlag = true

        }

        createBreadCrumb(step_name, step_ID, activeFlag)
    }

    // Workflow is closed, no need of showing buttons
    //console.log(closedState)
    if (closedState) {
        // console.log("removing section")
        $(document).trigger("removealleditfeatures")
        // $("#buttonsection").remove()
    }
    else {
        $("#buttonsection").removeClass("invisible")
    }
}

function addHiddenField(id, value) {
    //console.log(id+" " +value);
    var hiddenElement = $("<input/>").attr("type", "hidden")
        .attr("value", value)
        .attr("id", id)

    $("body").append($(hiddenElement))
}

function createBreadCrumb(stepName, id, isActive) {
    shortText = stepName;
    if (!isActive) {
        shortText = stepName.substring(0, 3) + "..."
    }
    stepcrumb = $("<li/>").text(shortText).attr("title", stepName)
    if (isActive) {
        $(stepcrumb).attr("class", "current")
    }
    $("#breadcrumb").append(stepcrumb)
}

function showStepOwner(stepOwnerList) {
    if (stepOwnerList && stepOwnerList.length > 0) {
        $("#stepowner").html(`Current Owner:- ${stepOwnerList["0"]}`)
    }
    $("#newOwner").val(stepOwnerList["0"])
}

function updateStepOwner() {

}

$(document).on("removealleditfeatures", function (event) {


    $("#buttonsection").remove()
    // $("#reopenbuttonsection").remove()


});

$(document).on("hidecomments", function (event) {


    $("#commentinputsec").hide()
    $("#commentinputholder").hide()


});

$(document).on("showcomments", function (event) {


    $("#commentinputsec").show()
    $("#commentinputholder").show()


});



function populateSteps(flow_id, isValidDownloadPDF) {

    stepsDocument = db.collection("Workflows")
        .doc(flow_id)
        .collection("steps")
        .where("visible", "==", true)
        .orderBy("index")
        .get()

    stepsDocument.then(function (querySnapshot) {
        querySnapshot.forEach(function (doc) {
            step = doc.data()
            step_id = doc.id
            //console.log(step)
            //set a default value for the number of fields.


            stepState = step["activestep"]
            stepOwners = step["users"]
            //console.log(stepOwners)
            isReviewOnly = step["onlyreview"]
            //console.log("isReviewOnly: "+isReviewOnly)
            doesUserHaveEditAccess = false
            userEmail = firebase.auth().currentUser.email
            usersWhoHaveAccess = []
            if ("users" in step) {
                usersWhoHaveAccess = step["users"]
            }

            var usersWhoHaveAccess = usersWhoHaveAccess.map(x => x.trim());

            if (usersWhoHaveAccess) {
                /* Only the first user in the list should have access
                to edit the workflow in any way
                */
                if (usersWhoHaveAccess.indexOf(userEmail) === 0) {
                    doesUserHaveEditAccess = true
                }
            }


            // console.log(doesUserHaveEditAccess)

            if (stepState && !doesUserHaveEditAccess) {
                //The step is active, but the user does not have access
                //to edit this step.
                $(document).trigger("removealleditfeatures")
                $(document).trigger("hidecomments")

            }

            if (workFlowClosedState) {
                $(document).trigger("showcomments")
            }


            if (!isReviewOnly) {
                if (step && stepState && doesUserHaveEditAccess) {
                    // console.log("Editable step")
                    createEditableStep(doc)

                }
                else {
                    //console.log("Viewable step")
                    createViewableStep(doc, isValidDownloadPDF)
                }
            }
            //Step is a review step and is active
            //just add hidden fields
            if (isReviewOnly && stepState) {
                addHiddenField("fieldCount", 0)
                addHiddenField("activestepid", step_id)
            }
            if (stepState) {
                /* We only remove the Reject button. 
                Its important to remember that the last step will have the
                nextStep property as null, but we still want the approve button to
                be visible.
                */
                previousStepIndex = step["previousStep"]
                //console.log("previousStepIndex: "+previousStepIndex)
                if (!previousStepIndex) {
                    $("#rejectButton").remove()
                }

            }

            // showStepOwner(stepOwners);


        });
    });

    let currentStepOwner = workflowData.step_owners
    showStepOwner(currentStepOwner);
}

function populateLogs(flow_id) {
    logDocument = db.collection("Workflows")
        .doc(flow_id)
        .collection("log")
        .orderBy("timestamp")
        .get()
    logDocument.then(function (querySnapshot) {
        querySnapshot.forEach(function (doc) {
            // doc.data() is never undefined for query doc snapshots
            log = doc.data();
            action = log["action"]
            creatorName = log["creatorName"]
            timestamp = log["timestamp"]


            hrts = new Date(parseInt(timestamp));
            if (action === "Created") {
                logText = creatorName + " " + action.toLowerCase() + " this workflow on " + hrts
                //console.log(logText)
                appendLogHTML(logText)
            }

            if (action === "Approved") {
                stepName = log["stepName"]
                logText = creatorName + " " + action.toLowerCase() + " the " + stepName + " step at " + hrts
                //console.log(logText)
                appendLogHTML(logText)
            }

            if (action === "Rejected") {
                stepName = log["stepName"]
                logText = creatorName + " " + action.toLowerCase() + " the " + stepName + " step at " + hrts
                //console.log(logText)
                appendLogHTML(logText)
            }

            if (action === "Closed") {

                logText = creatorName + " " + action.toLowerCase() + " the  workflow at " + hrts
                //console.log(logText)
                appendLogHTML(logText)
            }

            if (action === "Re-Opened") {

                logText = creatorName + " " + action.toLowerCase() + " the  workflow at " + hrts
                //console.log(logText)
                appendLogHTML(logText)
            }

            if (action === "ownershipchange") {
                stepName = log["stepName"]
                newUser = log["newOwner"]
                logText = creatorName + " " + "transferred ownership" + " of the " + stepName + " step to " + newUser + " on " + hrts
                //console.log(logText)
                appendLogHTML(logText)
            }

        });
    });
}

function appendComments(flow_id) {

    commentDocument = db.collection("Workflows")
        .doc(flow_id)
        .collection("comments")
        .orderBy("timestamp")
        .get()

    commentDocument.then(function (querySnapshot) {
        querySnapshot.forEach(function (doc) {
            // doc.data() is never undefined for query doc snapshots
            comment = doc.data();
            comment_text = comment["comment"]
            creator = comment["by"]
            creatorName = creator["name"]
            if ("photo" in creator) {
                creatorImagePath = creator["photo"]
            }
            else {
                creatorImagePath = "img/profileicons/" + creatorName.charAt(0).toUpperCase() + ".png"
            }

            creatorPhoto = creator["photo"]
            //console.log(creatorPhoto)
            timestamp = comment["timestamp"]

            hrts = humanized_time_span(timestamp);
            humanTime = new Date(parseInt(timestamp));
            commentIcon = $("<img/>").attr("src", creatorImagePath)
                .attr("class", 'profilephoto')

            creatorNameText = creatorName//+ " commented"
            nameDiv = $("<div/>").attr("class", "commentmeta")
                .text(creatorNameText)
            timeDiv = $("<div/>").attr("class", "grid_2 dateItalic")
                .text(hrts)
                .attr("title", humanTime)


            commentImageDiv = $("<div/>").attr("class", "grid_1 commenttext")
            commenttextdiv = $("<div/>").attr("class", "commenttext")
                .text(comment_text)
            blankdiv = $("<div/>").attr("class", "clear seperator")


            profileImageDiv = $("<div/>").attr("class", "grid_1 profilephotocontainer")
            commentContentDiv = $("<div/>").attr("class", "grid_10")
            //$(nameDiv).insertBefore("#commentsep")
            //$(timeDiv).insertBefore("#commentsep")
            //$(blankdiv).insertBefore("#commentsep")


            //$(commentImageDiv).append($(commentIcon))
            //$(commentImageDiv).insertBefore("#commentsep")
            //$(commenttextdiv).insertBefore("#commentsep")

            $(profileImageDiv).append($(commentIcon))
            $(profileImageDiv).insertBefore("#commentsep")



            $(commentContentDiv).append($(nameDiv))
            $(commentContentDiv).append($(commenttextdiv))
            $(commentContentDiv).append($(timeDiv))



            $(commentContentDiv).insertBefore("#commentsep")
            $(blankdiv).insertBefore("#commentsep")
            //$(blankdiv).insertBefore("#commentsep")






        });
    });

}

let editableStepsFields = 0
function createEditableStep(stepDoc) {
    //The whole logic assumes there will always be one form
    // Because there can only be one step which is actionable.
    // console.log("edi6table")
    stepID = stepDoc.id
    var stepForm = $("<form/>").attr("data-stepid", stepID)

    stepContent = stepDoc.data()
    //create a Dynamic Div for every Step
    var stepholder = $("<div/>")
        .attr("class", 'step container_12')
        .attr("id", stepID)

    var stepName = stepContent["name"]
    $(stepForm).append(stepholder)

    //Insert the div before the comment section
    $(stepForm).insertBefore("#commentssection")

    var stepNameDiv = $("<div/>")
        .attr("class", "grid_12 stepheader-active")
        .text(stepName)
    $(stepholder).append($(stepNameDiv))

    fieldsList = stepContent["fields"]
    numberOfFields = fieldsList.length
    if ("fieldValues" in stepContent) {
        fieldData = stepContent["fieldValues"]
    }
    else {
        fieldData = new Array()
    }
    //console.log(fieldData[0])    

    for (i = 0; i < numberOfFields; i++) {
        createField(stepID, fieldsList[i], i, fieldData[i], numberOfFields)
        if (fieldsList[i].mandatory)
            editableStepsFields++
    }
    let stepData = {
        stepContentData: stepContent,
        createEditableStepId: stepID,
        fieldData: fieldData
    }
    $(document).trigger("fieldTrigger", stepData);
    addHiddenField("fieldCount", numberOfFields)
    addHiddenField("activestepid", stepID)

    //Add validators to the newly created form.
    $(stepForm).validate({ errorElement: 'span', errorClass: "formerror" });

}

function createViewableStep(stepDoc, isValidDownloadPDF) {

    stepID = stepDoc.id
    stepContent = stepDoc.data()
    //create a Dynamic Div for every Step
    var stepholder = $("<div/>")
        .attr("class", 'step container_12')
        .attr("id", stepID)

    var stepName = stepContent["name"]


    //Insert the div before the comment section
    $(stepholder).insertBefore("#commentssection")

    var stepNameDiv = $("<div/>")
        .attr("class", "grid_12 stepheader")
        .text(stepName)

    $(stepholder).append($(stepNameDiv))

    fieldList = stepContent["fields"]
    fieldData = stepContent["fieldValues"]
    numberOfFields = fieldList.length
    //$("#fieldCount").val(numberOfFields)
    if (!fieldData) {
        fieldData = []
        for (i = 0; i < numberOfFields; i++) {
            fieldData.push("")
        }
    }
    for (i = 0; i < numberOfFields; i++) {

        viewField(stepID, fieldList[i], fieldData[i], isValidDownloadPDF)
    }

    // Review Steps Checklist
    getReviewStepsChecklist(flow_id, stepID)
}

// Checklist Section Template
function checklistSection() {
    var viewChecklistSectionTemplate = `<div id="@stepIDWrapper" class="step container_12">
    <div class="grid_12 stepheader">
      @stepName
    </div> 
    <div class="clear"></div>
  
    
    <div id="@stepIDContainer">
    </div>
  
    <div class="clear"></div> 
    <div class="clear"></div> 
  </div>`

    return viewChecklistSectionTemplate
}

function appendLogHTML(logText) {

    //console.log(logText)
    $("#actionlist").append($('<div/>').attr("class", "grid_1"))
    $("#actionlist").append($('<div/>').attr("class", "grid_10 logtext").append(logText))
    $("#actionlist").append($('<div/>').attr("class", "grid_1"))

}

//Create a hidden field inside the form
function createHiddenField(stepid) {
    $("#" + stepid).append(
        $('<input/>')
            .attr("type", "hidden")
            .val(stepid)
    )
}

let searchParam = {}
let formInputReset = false
let filledField = 0
let checkSameSelectToggle = {
    present: null,
    previous: null,
    visited: new Set()
}

// fieldTrigger on options
$(document).on('fieldTrigger', async function (event, stepData) {
    // Reopen worklfow condition added
    if (stepData && stepData.fieldData && stepData.fieldData.length > 0) {
        if (stepData.stepContentData) {
            if (stepData.stepContentData.fields && stepData.stepContentData.fields.length > 0) {
                (stepData.stepContentData.fields).map((item, index) => {
                    searchParam[item.label] = {
                        isChecklistTerm: item.isChecklistTerm,
                        value: stepData.fieldData[index]
                    }
                })



                var checklistItems = await checklistQuery(searchParam)

                if (checklistItems.success && checklistItems.data && checklistItems.data.docs && checklistItems.data.docs.length > 0) {
                    let doc = checklistItems.data.docs[0]
                    let checklist = doc.data().checklist
                    let stepIdActive = stepData.createEditableStepId
                    checklistTemplate(checklist, stepIdActive)
                    formInputReset = true
                    $("#approveButton").attr({
                        'disabled': true,
                        'title': "Button Enable"
                    })
                }
            }
        }
    }

    // Checklist update on options
    $("select").add("input").add("password").add("textarea").change(async function () {
        let labelName = $('option:selected', $(this)).attr('name')

        checkSameSelectToggle.previous = checkSameSelectToggle.present
        checkSameSelectToggle.present = labelName
        let isChecklistTerm = false;

        (stepData.stepContentData.fields).map((item) => {
            if (item.label === labelName) {
                isChecklistTerm = item.isChecklistTerm
            }
        })

        searchParam[labelName] = {
            isChecklistTerm: isChecklistTerm,
            value: $('option:selected', $(this)).val()
        }

        // If user select same field multiple times then filledField can not increment
        // If user select field which is already select then filledField can not increment

        if ((checkSameSelectToggle.present !== checkSameSelectToggle.previous
            && !checkSameSelectToggle.visited.has(labelName))
            || (formInputReset && isChecklistTerm)) {

            // If whole form field is selected & user changes any fields then checklist will reset
            // formInputReset is boolean and taking care of reset any value in from field

            if ((filledField === editableStepsFields - 1) || (formInputReset && isChecklistTerm)) {

                var checklistItems = await checklistQuery(searchParam)

                if (checklistItems.success && checklistItems.data && checklistItems.data.docs && checklistItems.data.docs.length > 0) {

                    let doc = checklistItems.data.docs[0]
                    let checklist = doc.data().checklist
                    
                    let stepIdActive = stepData.createEditableStepId

                    checklistTemplate(checklist, stepIdActive)

                    $("#approveButton").attr({
                        'disabled': true,
                        'title': "Button Enable"
                    })
                }

                else {
                    $("#checklistlabel").remove()
                    $("#approveButton").attr({
                        'disabled': false,
                        'title': "Button Enable"
                    })
                }


                formInputReset = true

            }

            filledField++
        }

        if (labelName)
            checkSameSelectToggle.visited.add(labelName)
    });

});

async function createField(stepid, fieldMeta, index, fieldData) {
    type = fieldMeta["type"]
    label = fieldMeta["label"]

    mandatory = fieldMeta["mandatory"]
    $("#" + stepid).append(
        $('<div/>')
            .attr("class", "grid_4 fieldlabel")
            .append(label)
    )


    if (type == "dropdown") {

        div = $('<div/>').attr("class", "grid_6 field")

        options = fieldMeta["options"];


        dd = $("<select/>")
            .attr("data-stepid", stepid)
            .attr("data-index", index)
            .attr("id", index)
            .attr("name", label)
        if (mandatory) {
            $(dd).attr("required", true)
        }
        $(dd).append($("<option/>"))
        for (index = 0; index < options.length; index++) {
            option = $("<option/>").val(options[index]).text(options[index]).attr("name", label)
            if (options[index] == fieldData) {
                $(option).prop("selected", true);
            }
            $(dd).append($(option))
        }
        $("#" + stepid).append($(div).append($(dd)))

        //Create a div to go to next line.


    }

    if (type === "range") {

        div = $('<div/>').attr("class", "grid_6 field")

        options = fieldMeta["options"];


        dd = $("<select/>")
            .attr("data-stepid", stepid)
            .attr("data-index", index)
            .attr("id", index)
            .attr("name", label)
        if (mandatory) {
            $(dd).attr("required", true)
        }
        $(dd).append($("<option/>"))
        min = fieldMeta["min"];
        max = fieldMeta["max"];
        //console.log(min)
        //console.log(max)
        for (index = min; index < max + 1; index++) {

            // console.log(index)
            option = $("<option/>").val(index).text(index)
            if (index === parseInt(fieldData)) {
                $(option).prop("selected", true);
            }
            $(dd).append($(option))
        }
        $("#" + stepid).append($(div).append($(dd)))

        //Create a div to go to next line.


    }
    if (type == "text") {

        div = $('<div/>').attr("class", "grid_6 field")

        inputBox = $('<input/>')
            .attr("type", "text")
            .attr('class', 'inputbox')
            .attr("data-stepid", stepid)
            .attr("data-index", index)
            .attr("id", index)
            .attr("name", index)
        //console.log($(inputBox))        
        if (mandatory) {
            $(inputBox).attr("required", true)
        }
        if (fieldData != undefined) {
            $(inputBox).val(fieldData)
        }
        $("#" + stepid).append($(div).append($(inputBox)))

        //Create a div to go to next line.


    }

    $("#" + stepid).append($('<div/>').attr("class", "clear"))
}

// Checklist Template On Create step
async function checklistTemplate(checklist, stepid) {
    $("#checklistlabel").remove();
    let totalquestion = checklist.length
    for (let checklistItem of checklist) {
        if (!checklistItem.mandatory) {
            totalquestion -= 1
        }
    }
    type = "accordian"
    label = "Checklist"
    mandatory = false
    div = $('<div/>').attr("class", "grid_6 field")

    let questionTemplate = ''
    let optionsTemplate = ''
    checklist.map((item, questionIndex) => {
        (item.options).map((options, index) => {
            optionsTemplate += `<label for=${questionIndex + '' + index}
                ><input
                  name=${questionIndex}
                  value=${options}
                  id=${questionIndex + '' + index}
                  type="radio"
                  class="input-checkbox"
                  onclick="checklistResponseButton(value, ${questionIndex + 1}, ${totalquestion}, ${item.mandatory})"
                />${options}</label
              >`
        })
        questionTemplate += `<div>
        <span><strong>Q${questionIndex + 1}</strong>: ${item.question}${item.mandatory ? `<sup><i style="color: #fff; font-size: 0.75rem; margin: 5px; margin-top: 5px" class="fa fa-asterisk" aria-hidden="true"></i></sup>` : ""}</span>
    </div>

      <div>
      ${optionsTemplate}
      
      </div><hr />`
        optionsTemplate = ''
    })
    inputBox = `<ul class="accordion">
    <li>
      <div id="fold" onclick=accordianChecklist() class="toggle"><i style="margin-right: 30px; float: right" class="fa fa-angle-down" aria-hidden="true"></i>CHECKLIST</div>
      <div class="hide">
      ${questionTemplate}
      </div>
    </li>
  </ul>`
    questionTemplate = ''

    div = $('<div/>').attr({
        "class": "checklist-label-nonActive",
        "id": "checklistlabel"
    }).css({
        margin: "10px",
        color: "#fff"
    })
    $("#" + stepid).append($(div).append($(inputBox)))

}

// Checklist View On Review Steps
async function createViewableChecklistTemplate(checklist, checklistResponse, stepid) {
    type = "accordian"
    label = "Checklist"
    mandatory = false
    div = $('<div/>').attr("class", "grid_6 field")

    let questionTemplate = ''
    let optionsTemplate = ''
    checklist.map((item, questionIndex) => {
        optionsTemplate += `<label class="view-checklist-response"
                ><input
                type="hidden"
                />${checklistResponse[questionIndex]}</label
              >`
        questionTemplate += `<div>
        <span><strong>Q${questionIndex + 1}</strong>: ${item.question}${item.mandatory ? `<sup><i style="color: #fff; font-size: 0.75rem; margin: 5px; margin-top: 5px" class="fa fa-asterisk" aria-hidden="true"></i></sup>` : ""}</span>
        ${optionsTemplate}
    </div><hr />`
        optionsTemplate = ''
    })
    inputBox = `<ul class="accordion">
    <li>
      <div id="nonFold" class="toggle">CHECKLIST</div>
      <div class="show view-checklist-wrapper">
      ${questionTemplate}
      </div>
    </li>
  </ul>`
    questionTemplate = ''

    div = $('<div/>').attr({
        "class": "checklist-label-active",
        "id": "viewChecklistlabel"
    }).css({
        margin: "10px",
        color: "#fff"
    })
    $("#" + stepid).append($(div).append($(inputBox)))
}

// Query on checklist
async function checklistQuery(searchParam) {
    console.log("ID STEP DATA ----->", stepID)
    let query = db.collection("Checklist")
    query = query.where("stepID", "==", stepID)
    // console.log("STEP ID ----->", checklistSearchStepID)
    console.log("WORKFLOW TYPE ----->", searchParam)
    query = query.where("flowType", "==", workflowData['flowType'])
    query = query.where("isActive", "==", true)
    for (searchParamsItem in searchParam) {
        if (searchParam[searchParamsItem].isChecklistTerm)
            query = query.where(searchParamsItem, "==", searchParam[searchParamsItem].value)
    }
    const responseChecklist = await query.get()
    if (responseChecklist.empty) {
        return {
            sucess: false,
            message: "No data found"
        }
    }

    // console.log("DOCUMENT ----->", responseChecklist)

    return {
        success: true,
        data: responseChecklist
    }
}

let responseArray = {}
let responseOfQuestion = {}
let mandatoryQuestionCount = 0

// Toggle on radio button options
function checklistResponseButton(optionChosen, questionNo, totalMandatoryQuestion, mandatoryQuestion) {

    if (mandatoryQuestion && !responseArray.hasOwnProperty(questionNo))
        mandatoryQuestionCount++


    responseOfQuestion.questionNo = questionNo
    responseOfQuestion.response = optionChosen
    responseOfQuestion.mandatoryQuestion = mandatoryQuestion

    responseArray[questionNo] = responseOfQuestion

    // console.log("MANDATORY QUESTION ------->", mandatoryQuestionCount)

    if (mandatoryQuestionCount === totalMandatoryQuestion) {
        $("#checklistlabel").removeClass("checklist-label-nonActive")
        $("#checklistlabel").addClass("checklist-label-active")
        $("#approveButton").attr({
            'disabled': false,
            'title': "Button Enable"
        })
    }
}


// Foldable checklist
function accordianChecklist() {
    let $this = $("#fold");
    if ($this.next().hasClass('show')) {
        $this.next().removeClass('show');
        $this.next().slideUp(350);
    } else {
        $this.parent().parent().find('li .inner').removeClass('show');
        $this.parent().parent().find('li .inner').slideUp(350);
        $this.next().toggleClass('show');
        $this.next().slideToggle(350);
    }
}

// Create and view checklist of review steps
async function getReviewStepsChecklist() {
    if (workflowData && workflowData['active_step_id']) {
        var activeStepData = await getActiveStepId(workflowData, flow_id)
        var activeStepChecklist = activeStepData.data() && activeStepData.data()["checklist"] ? await activeStepData.data()["checklist"].get() : $('#' + 'approveButton').attr('disabled', false)
    }
    let stepsData = await getStepData(flow_id)
        if (stepsData && !stepsData.empty && stepsData.docs && stepsData.docs.length > 0) {
            console.log("STEP DATA ----->", stepsData)
            stepsData.docs.map(async (item) => {

                // Create checklist sections for steps
                var createChecklistSection = checklistSection()
                createChecklistSection = createChecklistSection.replace("@stepName", item.data().name)
                createChecklistSection = createChecklistSection.replace("@stepIDWrapper", item.id + "checklistContainerEditViewWrapper")
                createChecklistSection = createChecklistSection.replace("@stepIDContainer", item.id + "checklistContainerEditView")
                $(createChecklistSection).insertBefore("#commentssection")

                // Checklist enabler & close workflow condition added
                if ((item.data()["checklist"] && activeStepData && activeStepData.data() && item.data()['index'] <= activeStepData.data()['index']) || workflowData.closed) {

                    // Reference from steps key checklist
                    let stepChecklist = await item.data()["checklist"].get()
                    console.log(stepChecklist)
                    if(item.data()["checklistResponse"]) 
                        var stepChecklistResponse = await item.data()["checklistResponse"].get()


                    // One active id step
                    if (activeStepData && activeStepData.id && item.id === activeStepData.id) {
                        checklistTemplate(activeStepChecklist.data()['checklist'], activeStepData.id + "checklistContainerEditView")
                    }
                    
                    // Create all view checklist steps
                    else {
                        if ($("#" + item.id) && ($("#" + item.id).find("div")) && ($("#" + item.id).find("div")).length > 0 && ($("#" + item.id).find("div"))[0].innerHTML && ($("#" + item.id).find("div"))[0].innerHTML === item.data()['name']) {
                            createViewableChecklistTemplate(stepChecklist.data()['checklist'], stepChecklistResponse.data()['checklistResponse'],
                                item.id)
                            $("#" + item.id + "checklistContainerEditViewWrapper").remove()
                        }
                            
                        else
                            createViewableChecklistTemplate(stepChecklist.data()['checklist'], stepChecklistResponse.data()['checklistResponse'],
                                item.id + "checklistContainerEditView")
                    }
                }

                // Remove checklist section
                else {
                    $("#" + item.id + "checklistContainerEditViewWrapper").remove()
                }
            })
        }
}



function viewField(stepID, fieldsList, fieldData, isValidDownloadPDF) {

    label = fieldsList["label"]


    $("#" + stepID).append(
        $('<div/>')
            .attr("class", "grid_4 fieldlabel")
            .append(label)
    )



    value = fieldData;
    fieldDisplay = null
    if ("displayAs" in fieldsList) {
        fieldDisplay = fieldsList["displayAs"]
    }
    fieldValue = value;
    if (fieldDisplay === "url" && value) {
        // fieldValue=$("<a>")
        //             .attr("href", value)
        //             .attr("class", "fieldlink")
        //             .append(value)


        // Button visible for valid doc url
        fieldValue = `<a href=${value} class='fieldlink col-6'>${value}</a>`

        if (isValidDocUrl(value) && isValidDownloadPDF) {

            downloadButton = $("<button/>")
            $(downloadButton).attr("id", "urlButtonValue")
            imgButton = $("<img/>")
            $(imgButton).attr("width", "48")
            $(imgButton).attr("src", "img/pdf-download.png")
            $(downloadButton).append(imgButton)
            $(downloadButton).addClass("col-6, button-img")
            $(downloadButton).attr("onclick", "downloadPdf(value)")

            $(downloadButton).attr("value", value)
            //    $(downloadButton).attr("src", "img/pdf-download.png")
            //    $(downloadButton).attr("width", "48")

            //$(downloadButton).attr("id", "urlButtonValue")

            //fieldValue=fieldValue+ `<button id="urlButtonValue" value=${value} onclick="downloadPdf(value)" class=''>Download</button>`




            divURL = $('<div/>').attr("class", "grid_5 field row mr-auto text-overflow").append(fieldValue)
            divButton = $('<div/>').attr("class", "grid_1 field row mr-auto").append($(downloadButton))



            //console.log($(inputBox))        

            $("#" + stepID).append($(divURL))
            $("#" + stepID).append($(divButton))

            //Create a div to go to next line.



            $("#" + stepID).append($('<div/>').attr("class", "clear"))
            return 0
        }
    }




    div = $('<div/>').attr("class", "grid_6 field").append(fieldValue)


    //console.log($(inputBox))        

    $("#" + stepID).append($(div))

    //Create a div to go to next line.



    $("#" + stepID).append($('<div/>').attr("class", "clear"))
}

const getWatermark = async (done) => {
    try {
        if (workflowData && workflowData['flowType']) {
            var watermarkImage = await db.collection("Watermarks").where('workflowType', '==', workflowData['flowType'])
                .get()
            done(watermarkImage.docs[0].data())
        }
    } catch (err) {
        console.log(err)
    }
}

const downloadPdf = async (url) => {
    try {
        console.log(url)
        let workflowImages;

        await getWatermark(async function (image) {
            workflowImages = image.imageChoices
            console.log(workflowImages)
            var imageTemplate = ''
            workflowImages.map(doc => {
                imageTemplate += `<label>
                <input type="radio" name="imageButton" value=${doc.path} ${doc.isDefault ? 'checked' : ''}>
                <img src=${doc.path}>
              </label>`
            })
            var radioButton = `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Document</title>
                <link rel="stylesheet" href="css/radioImages.css" />
            </head>
            <body>
            ${imageTemplate}
            </body>
            </html>`
            Swal.queue([{
                title: `<i>Choose Watermark</i>`,
                confirmButtonText: 'Generate PDF',
                html: radioButton,
                showLoaderOnConfirm: true,
                preConfirm: async () => {
                    var imgUrl = $('input[name=imageButton]:checked').val()

                    let userDetails = getLoggedInUserObject()
                    let userData = {
                        "name": userDetails["name"],
                        "email": userDetails["email"],
                        "photo": userDetails["photo"]
                    }
                    let params = {
                        "docUrl": url,
                        "watermarkUrl": imgUrl,
                        "flowId": flow_id,
                        "userData": userData
                    }
                    // HTTP Request 
                    await axios.post('https://us-central1-renamingfilesforquiz.cloudfunctions.net/app/api/pdfConvert',
                        params
                    ).then((res) => {
                        if (res && res.data && res.data.success && res.data.data) {
                            var popUp = window.open(
                                res.data.data,
                                '_blank', // <- it open in a new window.
                                'toolbar=0,location=0,directories=0,status=1,menubar=0,titlebar=0,scrollbars=1,resizable=1,width=' + 1000 + ',height=' + 500
                            );
                            try {
                                popUp.focus()
                                swal({
                                    title: "File has been created, Successfully!",
                                    icon: "success",
                                    button: true,
                                });
                            }
                            catch {
                                swal({
                                    title: "File has been created, Successfully!",
                                    text: "Note- Pop-up Blocker is enabled! Please add this site to your exception list.",
                                    icon: "success",
                                    button: true,
                                });
                            }
                        }
                        else {
                            swal({
                                title: 'Error',
                                icon: 'error',
                                text: res.data.data.message
                            })
                        }
                    }).catch((err) => {
                        swal({
                            title: 'Error',
                            icon: 'error',
                            text: err.message
                        })
                    })
                }
            }])
        })
    }
    catch (err) {
        swal({
            title: 'Error',
            icon: 'error',
            text: err.message
        })
    }
}

const isValidDocUrl = (url) => {
    // doc url validate
    var urlRegx = new RegExp('(docs.google.com|(drive.google.com))(://[A-Za-z]+-my.sharepoint.com)?', 'i');
    return urlRegx.test(url)
}

const isValidStepForDownload = async () => {
    try {
        if (workflowData && workflowData['active_step_id']) {
            var activeStep = await getActiveStepId(workflowData, flow_id)
            if (activeStep && activeStep.exists) {
                return activeStep.data()['isDownloadPDF']
            }
        }
        return 0
    } catch (err) {
        console.log(err)
    }
}

const getActiveStepId = async (workflowData, flow_id) => {
    return await db.collection("Workflows").doc(flow_id).collection('steps').doc(workflowData['active_step_id']).get()
}

const getStepData = async (flow_id) => {
    let allStepsData = await db.collection("Workflows").doc(flow_id).collection('steps').get()
    return allStepsData
}