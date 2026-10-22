public class CarRenatalsController {
	
    @AuraEnabled
    public static list<Rental_Car__c> getAvailableCars(CarsWrapper filters){
        string query = 'SELECT Id, Name, Available__c,Brand__c,In_Repair__c,Model__c,Year__c,Rent_Per_Day__c FROM Rental_Car__c';
        map<String,Object>fieldValueMap = new map<String,Object>();
        if(filters != null){
            if(filters.avaialble){
                fieldValueMap.put('Available__c',filters.avaialble);
            }
            if(filters.carNumber!=null && filters.carNumber!=''){
                fieldValueMap.put('Name',filters.carNumber);
            }
            if(filters.carYear!=null && filters.carYear!=''){
                fieldValueMap.put('Year__c',filters.carYear);
            }
            if(filters.carModel!=null && filters.carModel!=''){
                fieldValueMap.put('Model__c',filters.carModel);
            }
            if(filters.carBrand!=null && filters.carBrand!=''){
                fieldValueMap.put('Brand__c',filters.carBrand);
            }
            if(filters.isRepair == false){
                fieldValueMap.put('In_Repair__c',filters.isRepair);
            }
        }
        
        if(!fieldValueMap.isEmpty()){
            String whereCondition = '';
            Integer mapSize = fieldValueMap.keySet().size();
            list<String>booleanFields = new list<String>{'Available__c','In_Repair__c'};
            Integer iterCount = 0;
            for(String field : fieldValueMap.keySet()){
                iterCount+=1;
                whereCondition += field + '=' + (booleanFields.contains(field)
                        ? fieldValueMap.get(field)
                        : '\'' + fieldValueMap.get(field) + '\'') + (iterCount < mapSize ? ' AND ' : '');            
            }
            query = query + ' WHERE ' + whereCondition;
        }
        system.debug(query);
        return database.query(query);
    }
    
    @AuraEnabled
    public static void processBooking(map<String,object>bookingInfo){
        Car_Bookings__c CB = new Car_Bookings__c();
        CB.Start_Date__c = (Datetime) JSON.deserialize(
                                '"' + (String)bookingInfo.get('stDate') + '"',
                                Datetime.class
                            );
        CB.End_Date__c =(Datetime) JSON.deserialize(
                            '"' + (String)bookingInfo.get('enDate') + '"',
                            Datetime.class
                        );
        CB.Rental_Car__c  = (Id)bookingInfo.get('carId');
        CB.Customer_Mobile__c = (String)bookingInfo.get('mobile');
        CB.Customer_Govt_Id__c = (String)bookingInfo.get('govtId');
        CB.Customer_Name__c = (String)bookingInfo.get('cName');
        CB.Total_Days__c = (Decimal)bookingInfo.get('totalDays');
        CB.Booking_Cost__c = (Decimal)bookingInfo.get('totalCost');
        insert CB;
        
        Rental_Car__c RC = new Rental_Car__c();
        RC.Id = CB.Rental_Car__c;
        RC.Available__c= false;
        update RC;
    }
    
	@AuraEnabled
    public static list<Car_Bookings__c> getBookings(Boolean isSearch,Boolean isFilter,map<String,String>searchInfo,map<String,String>filterInfo){
        string baseQuery = 'SELECT Id,Name,CreatedDate,Start_Date__c,End_Date__c,Customer_Govt_Id__c,Customer_Name__c,Customer_Mobile__c,Rental_Car__c,Rental_Car__r.Brand__c,Rental_Car__r.Model__c,Rental_Car__r.Name,Rental_Car__r.Rent_Per_Day__c,Actual_Return__c,Status__c,Delayed_Days__c,Total_Days__c,Booking_Cost__c FROM Car_Bookings__c';
        if(!isSearch && !isFilter){
            string query = baseQuery + ' Order By CreatedDate DESC LIMIT 2000';
            return database.query(query);
        }
        else if(isSearch && !searchInfo.isEmpty() && searchInfo!=null){
            string field = searchInfo.get('field');
            string value = searchInfo.get('value');
            string query = baseQuery + ' WHERE ' + field + ' LIKE \'%' + value + '%\'';
            return database.query(query);
        }
        else if(isFilter && !filterInfo.isEmpty() && filterInfo!=null){
            string filter = filterInfo.get('filter');
            string query = baseQuery + ' WHERE ' + filter;
            return database.query(query);
        }
        else{
            return null;
        }
    }    
    
    @AuraEnabled
    public static void updateBookingOnReturn(Id bookingId,decimal revAmount,Boolean isDelayed){
        Car_Bookings__c cb = new Car_Bookings__c();
        cb.Id = bookingId;
        cb.Actual_Return__c = system.now();
        cb.Paid_Amount__c = revAmount;
        update cb;
        list<Car_Bookings__c>bookedCar = [SELECT Id,Rental_Car__c FROM Car_Bookings__c WHERE Id =: bookingId AND Rental_Car__c != null];
        if(!bookedCar.isEmpty()){
            Id bookedCarId = bookedCar[0].Rental_Car__c;
            Rental_Car__c RC = new Rental_Car__c();
            RC.Available__c = true;
            update RC;
        }
    }
    
        
        
    public class CarsWrapper{
        @AuraEnabled public Boolean avaialble { get; set; } 
        @AuraEnabled public String carNumber { get; set; }
        @AuraEnabled public String carYear { get; set; }
        @AuraEnabled public String carModel { get; set; }
        @AuraEnabled public String carBrand { get; set; }
        @AuraEnabled public Boolean isRepair { get; set; }
    }
}