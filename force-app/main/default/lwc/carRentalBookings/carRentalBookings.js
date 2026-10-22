import { LightningElement,wire,track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getBookings from '@salesforce/apex/CarRenatalsController.getBookings';
import updateBookingOnReturn from '@salesforce/apex/CarRenatalsController.updateBookingOnReturn';
import LightningConfirm from 'lightning/confirm';
import Toast from 'lightning/toast';

export default class CarRentalBookings extends LightningElement {
    parameterValue;
    @track bookingsList = [];
    @track selectedRows = [];

    @wire(CurrentPageReference)
    getPageRef(pageRef) {
        console.log('PAGE REF:', JSON.stringify(pageRef));

        if (pageRef) {
            this.parameterValue = pageRef.state?.c__myParameter;
            console.log('PARAMETER:', this.parameterValue);
        }
    }

    columns = [
        {
            label: 'Record Number',
            fieldName: 'recordIdLink',
            type: 'url',
            typeAttributes: {
                label: { fieldName: 'Name' }, 
                target: '_blank'
            },
            initialWidth: 120,
        },
        { label: 'Car Number', fieldName: 'carNumber',initialWidth: 120, },
        { label: 'Car Name', fieldName: 'carName',initialWidth: 200, },
        { label: 'Customer Name', fieldName: 'Customer_Name__c',initialWidth: 200, },
        { label: 'Customer Mobile', fieldName: 'Customer_Mobile__c',initialWidth: 150, },
        { label: 'Status', fieldName: 'Status__c',cellAttributes:{class:{fieldName:'statusColor'}},initialWidth: 100, },
        { label: 'Pickup Date', fieldName: 'Start_Date__c',type: 'date',
            typeAttributes: {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
            },
            initialWidth: 200,
        },
        { label: 'Expected Return Date', fieldName: 'End_Date__c',type: 'date',
            typeAttributes: {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
            },
            initialWidth: 200,
        },
    ];

    @track searchFoam = {field:'',value:''};
    @track filterFoam = {};

    searchFormFields = [
            { label: 'Status', value: 'Status__c' },
            { label: 'Booking Id', value: 'Name' },
            { label: 'Car Number', value: 'Rental_Car__r.Name' },
            { label: 'Car Brand', value: 'Rental_Car__r.Brand__c' },
            { label: 'Car Model', value: ',Rental_Car__r.Model__c' },
            { label: 'Customer Name', value: 'Customer_Name__c' },
            { label: 'Customer Mobile', value: 'Customer_Mobile__c' },
        ];

    showToast(title,msg,variant) {
        Toast.show({
                label: title,
                message: msg,
                variant: variant,
                mode: 'dismissible',
            });
    }

    connectedCallback(){
        this.fetchBookings(false,false,null,null);
    }

    fetchBookings(isSearch,isFilter,searchInfo,filterInfo){
        getBookings({isSearch:isSearch,isFilter:isFilter,searchInfo:searchInfo,filterInfo:filterInfo})
        .then(result=>{
            console.log(JSON.stringify(result));
            this.bookingsList = result.map(item => ({...item,carNumber : item.Rental_Car__r.Name,carName:`${item.Rental_Car__r.Brand__c} ${item.Rental_Car__r.Model__c}`,statusColor:item.Status__c=='Delyed' ? "slds-text-color_error" : item.Status__c=='In Ride' ? "slds-text-color_warning" : "slds-text-color_success",recordIdLink:`/${item.Id}`}));
        })
        .catch(error=>{
            console.log(error);
        })
    }

    handleRowSelection(event) {
        const selectedRows = event.detail.selectedRows; 
        this.selectedRows = selectedRows;
        console.log('Selected Rows Data: ', JSON.stringify(selectedRows));
    }

    async processReturn(){
        const rowsSelected = this.selectedRows.length;
        if(rowsSelected){
            if(rowsSelected > 1){
                this.showToast('Error','Only one record can be selected','error');
                return;
            }
            else{
                const row = this.selectedRows[0];
                const bookingId = row.Id;
                const enDate = row.End_Date__c;
                const estCost = row.Booking_Cost__c;
                const rentPerDay = row.Rental_Car__r.Rent_Per_Day__c;
                const bookingStatus = row.Status__c;
                if(bookingStatus == 'Returned'){
                    this.showToast('Error','Already returned','error');
                    return;
                }
                const {revisedCost,isDelayed,diffDays} = this.calculateActualCost(enDate,estCost,rentPerDay);
                const result = await LightningConfirm.open({
                    message: isDelayed ? `The return was delayed for ${diffDays} days, the revised cost is ${revisedCost}/-` : `On time return. Amount to be paid ${estCost}/-`,
                    label: isDelayed ? 'Delay Return' : 'Ontime Return',
                    theme: isDelayed ? 'warning' : 'success',
                });
                
                if(result){
                    updateBookingOnReturn({bookingId:bookingId,revAmount:revisedCost,isDelayed:isDelayed})
                    .then(result=>{
                        console.log(result);
                        this.showToast('Success','Returned successfully','success');
                        this.fetchBookings();
                    })
                    .catch(error=>{
                        console.log(error);
                        this.showToast('Error',error,'error');
                    })
                }
            }
        }
        else{
            this.showToast('Error','Please select the record','error');
            return;
        }
    }

    calculateActualCost(endDate,estimatedCost,perDayRent){
        const returnData = {revisedCost:estimatedCost,isDelayed:false,diffDays:0};
        const end = new Date(endDate);
        const currentDate = new Date();
        const millisecondsPerDay = 1000 * 60 * 60 * 24;
        const diff = (currentDate - end)/millisecondsPerDay;
        if(diff <= 0){
            
        }
        else{
            const addCost = diff * perDayRent;
            const totalCost = estimatedCost + addCost;
            returnData.revisedCost = Number(totalCost.toFixed(2));
            returnData.isDelayed = true;
            returnData.diffDays = Number(diff.toFixed(1)); ;
        }
        return returnData;
    }

    searchBookings(){
        this.fetchBookings(true,false,this.searchFoam,null);
    }

    searchInputHandler(event){
        const fieldInp = event.target.name;
        const valueInp = event.target.value;
        this.searchFoam = {...this.searchFoam,[fieldInp] : valueInp};
    }
}