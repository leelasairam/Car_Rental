import { LightningElement,track } from 'lwc';
import getAvailableCars from '@salesforce/apex/CarRenatalsController.getAvailableCars';
import processBooking from '@salesforce/apex/CarRenatalsController.processBooking';
import LightningConfirm from 'lightning/confirm';
import Toast from 'lightning/toast';

export default class CarRentalApp extends LightningElement {
    @track carFilters = {avaialble : true,isRepair : false,carBrand : '', carModel : '', carYear : '',carNumber : ''};
    @track bookingDtls = {cName:'',mobile:'',govtId:'',enDate:'',stDate:'',carId:'',carCost:''};
    @track cars = [];
    noCarsReturned = false;
    showModal = false;
    modalCarId;
    modalCarCost;

    carPickerDisplayInfo = {primaryField: "Model__c",additionalFields: ["Brand__c"],};

    connectedCallback(){
        this.applyFilters();
    }

    handleShowToast(title,msg,variant) {
        Toast.show({
                label: title,
                message: msg,
                variant: variant,
                mode: 'dismissible',
            });
    }

    handleFilterInp(event){
        const inpField = event.target.name;
        const inpValue = event.target.value;
        this.carFilters = {...this.carFilters,[inpField]:inpValue};
        //console.log('Fileter',JSON.stringify(this.carFilters));
    }

    applyFilters(){
        getAvailableCars({filters:this.carFilters})
        .then(result=>{
            console.log(JSON.stringify(result));
            this.noCarsReturned = result.length == 0 ? true : false;
            this.cars =  result;
        })
        .catch(error=>{
            console.log(error);
        })
    }

    hideModalBox(){
        this.showModal = false;
        this.bookingDtls = {cName:'',mobile:'',govtId:'',enDate:'',stDate:'',carId:'',carCost:''};
    }

    handleBooking(event){
        this.modalCarId = event.target.dataset.carid;
        this.modalCarCost = event.target.dataset.cost;
        console.log(this.modalCarId);
        this.showModal = true;
    }

    handleBookingInput(event){
        const inpField = event.target.name;
        const inpValue = event.target.value;
        this.bookingDtls = {...this.bookingDtls,[inpField]:inpValue,carId:this.modalCarId,carCost:this.modalCarCost};
        //console.log(JSON.stringify(this.bookingDtls));
    }

    async handleProcessBooking(){
        for (const [key, value] of Object.entries(this.bookingDtls)) {
            if(value==''){
                this.handleShowToast('Error','Please fill all fields','error')
                return;
            }
        }
        const {cost,days} = this.calculateCost(this.bookingDtls.stDate,this.bookingDtls.enDate,this.bookingDtls.carCost);

        const result = await LightningConfirm.open({
            message: `This is will cost ${cost}/- for ${days} day(s).`,
            label: 'Confirm Booking?',
            theme: 'warning',
        });
        console.log('confirm result', result);
        if(result){
            const bookingDtls1 = {};
            for (const [key, value] of Object.entries(this.bookingDtls)){
                bookingDtls1[key] = key == 'stDate' || key == 'enDate' ? new Date(value) : value;
            }
            processBooking({bookingInfo:bookingDtls1})
            .then(result=>{
                console.log(result);
                this.handleShowToast('Success','Booking successful','success');
                this.hideModalBox();
                this.applyFilters();
            })
            .catch(error=>{
                console.log(error);
                this.handleShowToast('Error',error,'error');
            })
        }
    }

    calculateCost(stDate, enDate, costPerDay) {
        const start = new Date(stDate);
        const end = new Date(enDate);
        const differenceMs = end - start;
        if (differenceMs < 0) {
            return 0;
        }
        const days = Math.ceil(
            differenceMs / (1000 * 60 * 60 * 24)
        );
        return {cost:days * Number(costPerDay),days:days};
    }
}